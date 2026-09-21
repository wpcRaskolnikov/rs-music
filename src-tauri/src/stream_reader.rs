use reqwest::blocking::{Client, Response};
use reqwest::header::RANGE;
use std::io::{self, Read, Seek, SeekFrom};

pub struct StreamReader {
    client: Client,
    url: String,
    pos: u64,
    length: u64,
    response: Response,
    buffer: Vec<u8>,
    buffer_start: u64,
    chunk_size: usize,
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
        let chunk_size = 512 * 1024; // 512KB

        Self {
            client,
            url: url.to_string(),
            pos: 0,
            length,
            response,
            buffer: Vec::with_capacity(chunk_size),
            buffer_start: 0,
            chunk_size: chunk_size,
        }
    }

    pub fn byte_len(&self) -> u64 {
        self.length
    }
}

impl Read for StreamReader {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        if buf.is_empty() {
            return Ok(0);
        }

        if self.pos >= self.buffer_start + self.buffer.len() as u64 {
            self.buffer_start = self.pos;
            self.buffer.clear();
            let total_fetched = self
                .response
                .by_ref()
                .take(self.chunk_size as u64)
                .read_to_end(&mut self.buffer)?;

            if total_fetched == 0 {
                return Ok(0);
            }
        }

        let offset = (self.pos - self.buffer_start) as usize;
        let available = &self.buffer[offset..];

        let copy_len = std::cmp::min(available.len(), buf.len());
        buf[..copy_len].copy_from_slice(&available[..copy_len]);
        self.pos += copy_len as u64;

        Ok(copy_len)
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
        let is_cached =
            new_pos >= self.buffer_start && new_pos < self.buffer_start + self.buffer.len() as u64;

        // 未命中缓存，并且确实发生了位移
        if !is_cached && new_pos != self.pos {
            let response = self
                .client
                .get(&self.url)
                .header(RANGE, format!("bytes={}-", new_pos))
                .send()
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?
                .error_for_status()
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;

            self.response = response;
            self.buffer.clear();
            self.buffer_start = new_pos;
        }

        self.pos = new_pos;
        Ok(self.pos)
    }
}
