import React from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Login from "./Login"
import VideoCall from "./VideoCall"

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/video-call" element={<VideoCall />} />
      </Routes>
    </Router>
  )
}

export default App
