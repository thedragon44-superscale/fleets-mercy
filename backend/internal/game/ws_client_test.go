package game

import (
	"sync"
	"testing"
)

func TestWSClientHeadDropLatestFrame(t *testing.T) {
	c := NewWSClient(nil)
	c.Enqueue([]byte("frame-1"))
	c.Enqueue([]byte("frame-2"))
	c.Enqueue([]byte("frame-3"))
	c.Enqueue([]byte("frame-4"))

	// With wsClientQueueSize=3, frame-1 is evicted and the newest 3 frames remain in order.
	expected := []string{"frame-2", "frame-3", "frame-4"}
	for _, want := range expected {
		got := string(<-c.send)
		if got != want {
			t.Fatalf("expected %q after head-drop, got %q", want, got)
		}
	}
	c.Close()
}

func TestWSClientConcurrentEnqueueAndCloseNoPanicOrRace(t *testing.T) {
	for iter := 0; iter < 50; iter++ {
		c := NewWSClient(nil)
		var wg sync.WaitGroup

		// Consumer mimicking WritePump draining frames until Close()
		wg.Add(1)
		go func() {
			defer wg.Done()
			for range c.send {
			}
		}()

		// Multiple concurrent producers mimicking 60Hz broadcast ticks
		for p := 0; p < 4; p++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for i := 0; i < 200; i++ {
					c.Enqueue([]byte("tick"))
				}
			}()
		}

		// Abrupt disconnect closing the channel mid-broadcast
		wg.Add(1)
		go func() {
			defer wg.Done()
			c.Close()
			c.Close() // idempotent
		}()

		wg.Wait()
	}
}
