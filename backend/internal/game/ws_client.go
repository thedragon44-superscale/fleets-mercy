package game

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const wsClientQueueSize = 1

// WSClient wraps a WebSocket connection with a thread-safe latest-frame-wins (head-drop)
// send queue and dedicated writePump goroutine so slow or stalled clients never block
// the 60Hz simulation loop and concurrent Close() calls can never panic Enqueue().
type WSClient struct {
	Conn   *websocket.Conn
	mu     sync.Mutex
	send   chan []byte
	closed bool
}

func NewWSClient(conn *websocket.Conn) *WSClient {
	return &WSClient{
		Conn: conn,
		send: make(chan []byte, wsClientQueueSize),
	}
}

// Enqueue delivers payload non-blockingly using head-drop semantics: if an older frame
// is still waiting in the send buffer, it is evicted so the client always receives the
// freshest state. Safe to call concurrently with Close().
func (c *WSClient) Enqueue(payload []byte) {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return
	}
	select {
	case c.send <- payload:
	default:
		// Evict stale frame and insert newest snapshot
		select {
		case <-c.send:
		default:
		}
		select {
		case c.send <- payload:
		default:
		}
	}
	c.mu.Unlock()
}

// Close closes the send channel cleanly once, causing WritePump to exit.
func (c *WSClient) Close() {
	c.mu.Lock()
	if !c.closed {
		c.closed = true
		close(c.send)
	}
	c.mu.Unlock()
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
