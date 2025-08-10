import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Backend API E2E Tests', () => {
  describe('GET /api/settings', () => {
    it('should return configuration', async () => {
      const response = await axios.get(`${API_URL}/api/settings`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('language');
      expect(response.data).toHaveProperty('camera');
      expect(response.data).toHaveProperty('print');
      expect(response.data).toHaveProperty('gallery');
    });
  });

  describe('POST /api/settings', () => {
    it('should update configuration', async () => {
      const newSettings = {
        language: 'de',
        gallery: {
          enabled: true,
          limit: 50
        }
      };

      const response = await axios.post(`${API_URL}/api/settings`, newSettings);
      
      expect(response.status).toBe(200);
      expect(response.data.language).toBe('de');
      expect(response.data.gallery.limit).toBe(50);
    });
  });

  describe('POST /api/capture', () => {
    it('should capture photo', async () => {
      const response = await axios.post(`${API_URL}/api/capture`, {
        countdown: 3,
        filter: 'none'
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('filename');
      expect(response.data).toHaveProperty('url');
      expect(response.data).toHaveProperty('timestamp');
    }, 30000); // Extended timeout for capture
  });

  describe('GET /api/gallery', () => {
    it('should return gallery images', async () => {
      const response = await axios.get(`${API_URL}/api/gallery`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.images)).toBe(true);
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('page');
    });

    it('should support pagination', async () => {
      const response = await axios.get(`${API_URL}/api/gallery?page=1&limit=10`);
      
      expect(response.status).toBe(200);
      expect(response.data.images.length).toBeLessThanOrEqual(10);
      expect(response.data.page).toBe(1);
    });
  });

  describe('POST /api/print', () => {
    it('should queue print job', async () => {
      const response = await axios.post(`${API_URL}/api/print`, {
        filename: 'test-photo.jpg',
        copies: 1
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('jobId');
      expect(response.data).toHaveProperty('status');
      expect(response.data.status).toBe('queued');
    });
  });

  describe('GET /api/qrcode', () => {
    it('should generate QR code', async () => {
      const response = await axios.get(`${API_URL}/api/qrcode`, {
        params: { url: 'https://example.com/photo/123' },
        responseType: 'arraybuffer'
      });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image');
    });
  });

  describe('WebSocket Connection', () => {
    let io: any;

    beforeAll(async () => {
      const { io: socketIO } = await import('socket.io-client');
      io = socketIO;
    });

    it('should connect to WebSocket server', (done) => {
      const socket = io(API_URL);
      
      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        socket.disconnect();
        done();
      });
    });

    it('should receive gallery updates', (done) => {
      const socket = io(API_URL);
      
      socket.on('gallery-update', (data: any) => {
        expect(data).toHaveProperty('action');
        expect(data).toHaveProperty('image');
        socket.disconnect();
        done();
      });

      // Trigger an update
      socket.emit('request-gallery-update');
    });
  });

  describe('Hardware Integration', () => {
    it('should get GPIO status', async () => {
      const response = await axios.get(`${API_URL}/api/hardware/gpio/status`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('available');
      expect(response.data).toHaveProperty('pins');
    });

    it('should get camera status', async () => {
      const response = await axios.get(`${API_URL}/api/hardware/camera/status`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('connected');
      expect(response.data).toHaveProperty('type');
    });
  });

  describe('Admin Features', () => {
    it('should get system info', async () => {
      const response = await axios.get(`${API_URL}/api/admin/system`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('version');
      expect(response.data).toHaveProperty('uptime');
      expect(response.data).toHaveProperty('memory');
      expect(response.data).toHaveProperty('disk');
    });

    it('should delete photo', async () => {
      // First capture a photo
      const captureResponse = await axios.post(`${API_URL}/api/capture`);
      const filename = captureResponse.data.filename;
      
      // Then delete it
      const deleteResponse = await axios.delete(`${API_URL}/api/admin/photo/${filename}`);
      
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data).toHaveProperty('success');
      expect(deleteResponse.data.success).toBe(true);
    });

    it('should clear gallery', async () => {
      const response = await axios.post(`${API_URL}/api/admin/gallery/clear`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('deleted');
      expect(typeof response.data.deleted).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      try {
        await axios.get(`${API_URL}/api/unknown`);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should validate request body', async () => {
      try {
        await axios.post(`${API_URL}/api/settings`, {
          invalidField: 'test'
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    it('should handle malformed JSON', async () => {
      try {
        await axios.post(`${API_URL}/api/settings`, 'invalid json', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});