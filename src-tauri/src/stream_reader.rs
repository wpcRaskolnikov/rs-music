use reqwest::blocking::{Client, Response};
use reqwest::header::RANGE;
use std::io::{self, Read, Seek, SeekFrom};
use std::time::Duration;

pub struct StreamReader {
    client: Client,
    url: String,
    pos: u64,
    length: u64,
    response: Response,
}

impl StreamReader {
    pub fn new(url: &str) -> io::Result<Self> {
        let client = Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .build()
            .map_err(io::Error::other)?;
        let response = client
            .get(url)
            .header(RANGE, "bytes=0-")
            .send()
            .map_err(io::Error::other)?
            .error_for_status()
            .map_err(io::Error::other)?;
        let length = response.content_length().unwrap_or(0);

        Ok(Self {
            client,
            url: url.to_string(),
            pos: 0,
            length,
            response,
        })
    }

    pub fn byte_len(&self) -> u64 {
        self.length
    }

    fn request_range(&self, start: u64) -> io::Result<Response> {
        self.client
            .get(&self.url)
            .header(RANGE, format!("bytes={start}-"))
            .send()
            .map_err(io::Error::other)?
            .error_for_status()
            .map_err(io::Error::other)
    }
}

impl Read for StreamReader {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        const MAX_RETRIES: usize = 3;

        if buf.is_empty() {
            return Ok(0);
        }

        for _ in 0..MAX_RETRIES {
            match self.response.read(buf) {
                Ok(0) if self.length > 0 && self.pos < self.length => {
                    self.response = self.request_range(self.pos)?;
                }
                Ok(read) => {
                    self.pos += read as u64;
                    return Ok(read);
                }
                Err(_) => self.response = self.request_range(self.pos)?,
            }
        }

        let read = self.response.read(buf)?;
        self.pos += read as u64;
        Ok(read)
    }
}

impl Seek for StreamReader {
    fn seek(&mut self, pos: SeekFrom) -> io::Result<u64> {
        let new_pos = match pos {
            SeekFrom::Start(offset) => offset as i64,
            SeekFrom::Current(offset) => self.pos as i64 + offset,
            SeekFrom::End(offset) => self.length as i64 + offset,
        };

        if new_pos < 0 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Seek 偏移量不可为负数",
            ));
        }

        let new_pos = new_pos as u64;
        if new_pos != self.pos {
            self.response = self.request_range(new_pos)?;
        }

        self.pos = new_pos;
        Ok(self.pos)
    }
}
