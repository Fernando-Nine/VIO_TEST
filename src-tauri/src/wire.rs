pub const HEADER_SIZE: usize = 32;
pub const MAX_FRAMES: usize = 4800;

pub fn packet(state: u32, sequence: u32, dropped: u32, error: u32, pcm: &[f32]) -> Vec<u8> {
    assert!(pcm.len() <= MAX_FRAMES * 2 && pcm.len() % 2 == 0);
    let mut bytes = Vec::with_capacity(HEADER_SIZE + pcm.len() * 4);
    for value in [
        0x56494f41,
        1,
        state,
        sequence,
        dropped,
        (pcm.len() / 2) as u32,
        48000,
        error,
    ] {
        bytes.extend_from_slice(&value.to_le_bytes());
    }
    for value in pcm {
        bytes.extend_from_slice(&value.to_le_bytes());
    }
    bytes
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn pcm_packet_is_little_endian_stereo_with_bounded_header() {
        let bytes = packet(1, 7, 12, 0, &[0.5, -0.25]);
        assert_eq!(bytes.len(), 40);
        assert_eq!(&bytes[0..4], &0x56494f41u32.to_le_bytes());
        assert_eq!(&bytes[20..24], &1u32.to_le_bytes());
        assert_eq!(&bytes[32..36], &0.5f32.to_le_bytes());
        assert_eq!(&bytes[36..40], &(-0.25f32).to_le_bytes());
        assert_eq!(packet(3, 8, 0, 0x80004005, &[]).len(), HEADER_SIZE);
    }
    #[test]
    #[should_panic]
    fn oversize_packets_are_rejected() {
        packet(1, 0, 0, 0, &vec![0.0; MAX_FRAMES * 2 + 2]);
    }
}
