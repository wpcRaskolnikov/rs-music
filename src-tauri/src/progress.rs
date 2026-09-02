use tokio::sync::mpsc::Sender;

pub struct Progress {
    total: u64,
    last_percent: u8,
    progress_tx: Option<Sender<u8>>,
}

impl Progress {
    pub fn new(total: u64, progress_tx: Option<Sender<u8>>) -> Self {
        Self {
            total,
            last_percent: 0,
            progress_tx,
        }
    }

    pub fn update(&mut self, processed: u64) {
        if self.total == 0 {
            return;
        }
        let percent = ((processed as f64 / self.total as f64) * 100.0) as u8;
        if percent > self.last_percent {
            self.last_percent = percent;
            if let Some(tx) = &self.progress_tx {
                let _ = tx.try_send(percent);
            }
        }
    }

    pub fn finish(&self) {
        if let Some(tx) = &self.progress_tx {
            let _ = tx.try_send(100);
        }
    }
}
