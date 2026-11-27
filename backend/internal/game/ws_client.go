package game

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const wsClientQueueSize = 4

// WSClient wraps a WebSocket connection with a bounded send channel and dedicated
// writePump goroutine so slow or stalled clients never block the 60Hz simulation loop.
type WSClient struct {
	Conn      *websocket.Conn
	send      chan []byte
	closeOnce sync.Once
}

func NewWSClient(conn *websocket.Conn) *WSClient {
	return &WSClient{
		Conn: conn,
		send: make(chan []byte, wsClientQueueSize),
	}
}

// Enqueue attempts a non-blocking send. If the client's send queue is full,
// the frame is dropped for that client rather than stalling the 60Hz room tick.
func (c *WSClient) Enqueue(payload []byte) {
	select {
	case c.send <- payload:
	default:
	}
}

// Close closes the send channel cleanly once, causing WritePump to exit.
func (c *WSClient) Close() {
	c.closeOnce.Do(func() {
		close(c.send)
	})
}

// WritePump drains queued binary frames sequentially with a write deadline.
func (c *WSClient) WritePump() {
	defer c.Conn.Close()
	for payload := range c.send {
		_ = c.Conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if err := c.Conn.WriteMessage(websocket.BinaryMessage, payload); err != nil {
			return
		}
	}
}
