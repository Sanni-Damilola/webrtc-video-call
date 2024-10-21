import { io } from "socket.io-client"

export const socket = io("http://localhost:8080", {
  transports: ["websocket", "polling"], // Make sure WebSocket transport is enabled
  withCredentials: true,
})
