import React, { useEffect, useRef, useState } from "react"
import io from "socket.io-client"
import "./VideoCall.css"

const VideoCall: React.FC = () => {
  const [socket, setSocket] = useState<any>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const [receiverId, setReceiverId] = useState<string>("")
  const [incomingCall, setIncomingCall] = useState<boolean>(false)
  const [offer, setOffer] = useState<RTCSessionDescriptionInit | null>(null)
  const [isInCall, setIsInCall] = useState<boolean>(false)
  const [callerId, setCallerId] = useState<string>("")
  const id = localStorage.getItem("id")

  useEffect(() => {
    const socketIo = io("http://localhost:8080")
    setSocket(socketIo)

    // Register the user ID with the server
    if (id) {
      socketIo.emit("register", id)
    }

    // Listen for incoming call offers
    socketIo.on(
      "video-call-offer",
      (data: { offer: RTCSessionDescriptionInit; senderId: string }) => {
        if (data.offer && data.offer.type) {
          setOffer(data.offer)
          setCallerId(data.senderId)
          setIncomingCall(true) // Trigger incoming call prompt
        } else {
          console.error("Invalid offer received", data.offer)
        }
      }
    )

    socketIo.on(
      "video-call-answer",
      async (answer: RTCSessionDescriptionInit) => {
        if (peerConnectionRef.current && answer.type === "answer") {
          try {
            // Set the remote description for the caller
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(answer)
            )
          } catch (error) {
            console.error("Failed to set remote description:", error)
          }
        } else {
          console.error("Invalid answer received:", answer)
        }
      }
    )

    socketIo.on("ice-candidate", async (candidate: RTCIceCandidateInit) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          )
        } catch (error) {
          console.error("Failed to add ICE candidate:", error)
        }
      } else {
        console.error("Invalid candidate received:", candidate)
      }
    })

    socketIo.on("call-ended", () => {
      endCall() // Handle call end by resetting state
    })

    return () => socketIo.disconnect()
  }, [id])

  const initializePeerConnection = (stream: MediaStream) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })
    peerConnectionRef.current = peerConnection

    // Add local stream to peer connection
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream)
    })

    // Display local video stream in the local video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && receiverId) {
        socket.emit("ice-candidate", {
          senderId: id,
          receiverId,
          candidate: event.candidate,
        })
      }
    }

    // Display remote stream when received
    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0] // Display remote video stream
      }
    }
  }

  const startCall = async () => {
    if (!receiverId) {
      alert("Please enter a receiver ID.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      initializePeerConnection(stream)

      if (peerConnectionRef.current) {
        const offer = await peerConnectionRef.current.createOffer()
        await peerConnectionRef.current.setLocalDescription(offer)
        socket.emit("video-call-offer", { offer, senderId: id, receiverId })
        setIsInCall(true)
      }
    } catch (error) {
      console.error("Error starting the call:", error)
    }
  }

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      initializePeerConnection(stream)

      if (peerConnectionRef.current && offer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(offer)
          )
          const answer = await peerConnectionRef.current.createAnswer()
          await peerConnectionRef.current.setLocalDescription(answer)
          socket.emit("video-call-answer", {
            answer,
            receiverId: id,
            senderId: callerId,
            accepted: true,
          })
          setIsInCall(true)
          setIncomingCall(false)
        } catch (error) {
          console.error(
            "Error setting remote description or creating answer:",
            error
          )
        }
      } else {
        console.error("Offer is missing or invalid.")
      }
    } catch (error) {
      console.error("Error accepting the call:", error)
    }
  }

  const declineCall = () => {
    setIncomingCall(false)
    socket.emit("video-call-answer", {
      receiverId: id,
      senderId: callerId,
      accepted: false,
    })
  }

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    socket.emit("call-ended", { receiverId, senderId: id })
    setIsInCall(false) // Reset the call state
  }

  return (
    <div className="video-call-container">
      <h2>Video Call</h2>

      {/* Input to enter the receiver ID */}
      {!isInCall && (
        <div className="input-container">
          <label>Receiver ID:</label>
          <input
            type="text"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            placeholder="Enter receiver ID"
            className="receiver-input"
          />
        </div>
      )}

      {/* Call control buttons */}
      {!isInCall && (
        <button onClick={startCall} className="start-call-btn">
          Start Call
        </button>
      )}
      {isInCall && (
        <button onClick={endCall} className="end-call-btn">
          End Call
        </button>
      )}

      {/* Local and remote video display */}
      <div className="video-container">
        {/* Local video */}
        <div className="video-box">
          <h3>Local Video</h3>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
          />
        </div>

        {/* Remote video */}
        <div className="video-box">
          <h3>Remote Video</h3>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
          />
        </div>
      </div>

      {/* Incoming call prompt */}
      {incomingCall && (
        <div className="incoming-call-prompt">
          <h3>Incoming call from {callerId}</h3>
          <button onClick={acceptCall} className="accept-btn">
            Accept
          </button>
          <button onClick={declineCall} className="decline-btn">
            Decline
          </button>
        </div>
      )}
    </div>
  )
}

export default VideoCall
