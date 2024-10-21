import React, { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

const Login: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSpecialist, setIsSpecialist] = useState(false) // Toggle between user and specialist
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const loginUrl = isSpecialist
      ? "http://localhost:8080/api/v1/specialists/login"
      : "http://localhost:8080/api/v1/users/login"

    try {
      const response = await axios.post(loginUrl, {
        email,
        password,
      })

      if (response.data.status === "success") {
        const { token, data } = response.data
        const id = isSpecialist ? data.specialist.id : data.user.id

        // Save token and user/specialist ID in local storage
        localStorage.setItem("token", token)
        localStorage.setItem("id", id)
        localStorage.setItem("isSpecialist", JSON.stringify(isSpecialist)) // Save user type

        // Navigate to the video call component
        navigate("/video-call")
      }
    } catch (error) {
      console.error("Login failed", error)
    }
  }

  return (
    <div>
      <h1>{isSpecialist ? "Specialist" : "User"} Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={isSpecialist}
              onChange={() => setIsSpecialist(!isSpecialist)}
            />
            Login as Specialist
          </label>
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  )
}

export default Login
