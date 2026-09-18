use reqwest::blocking::Client;
use reqwest::header::RANGE;
use std::io::{self, Read, Seek, SeekFrom};

pub struct StreamReader {
    client: Client,
    url: String,
    pos: u64,
    length: u64,
    response: reqwest::blocking::Response,
}

impl StreamReader {
    pub fn new(url: &str) -> Self {
        let client = Client::new();
        let response = client
            .get(url)
            .header(RANGE, "bytes=0-")
            .send()
            .expect("无法请求音频 URL")
            .error_for_status()
            .expect("音频 URL 请求失败");

        let length = response.content_length().unwrap_or(0);

        Self {
            client,
            url: url.to_string(),
            pos: 0,
            length,
            response,
        }
    }

    pub fn byte_len(&self) -> u64 {
        self.length
    }
}

impl Read for StreamReader {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        let bytes_read = self.response.read(buf)?;
        self.pos += bytes_read as u64;
        Ok(bytes_read)
    }
}

impl Seek for StreamReader {
    fn seek(&mut self, pos: SeekFrom) -> io::Result<u64> {
        let new_pos = match pos {
            SeekFrom::Start(offset) => offset as i64,
            SeekFrom::Current(offset) => self.pos as i64 + offset,
            SeekFrom::End(offset) => {
                if self.length == 0 {
                    return Err(io::Error::new(io::ErrorKind::Unsupported, "未知音频长度"));
                }
                self.length as i64 + offset
            }
        };

        if new_pos < 0 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Seek 偏移量不可为负数",
            ));
        }

        let new_pos = new_pos as u64;

        if new_pos != self.pos {
            let response = self
                .client
                .get(&self.url)
                .header(RANGE, format!("bytes={}-", new_pos))
                .send()
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?
                .error_for_status()
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;

            self.response = response;
            self.pos = new_pos;
        }

        Ok(self.pos)
    }
}
