"use client"

import { useState, useRef, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, Play, Pause, Music, Sun, Moon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function SmartVolume() {
  // Audio refs and state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [audioTime, setAudioTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)

  // Add new state for curve type
  const [useExponential, setUseExponential] = useState(true)
  
  // Add dark mode state
  const [isDarkMode, setIsDarkMode] = useState(true)

  // The exponential function
  const toExponential = (value: number) => {
    const a = 4
    return (Math.exp(a * value) - 1) / (Math.exp(a) - 1)
  }

  // Linear function (straight passthrough)
  const toLinear = (value: number) => {
    return value
  }

  // Function to convert based on selected curve type
  const convertValue = (value: number) => {
    return useExponential ? toExponential(value) : toLinear(value)
  }

  // Generate data points for the curve
  const generateDataPoints = () => {
    const points = []
    for (let i = 0; i <= 100; i++) {
      const x = i / 100
      points.push({
        linearValue: x,
        exponentialValue: toExponential(x),
        currentValue: convertValue(x)
      })
    }
    return points
  }

  const data = generateDataPoints()

  // Track current slider value for demonstration
  const [sliderValue, setSliderValue] = useState(0.5)
  const outputValue = convertValue(sliderValue)

  // Current point to highlight on the graph
  const currentPoint = {
    linearValue: sliderValue,
    exponentialValue: useExponential ? outputValue : toExponential(sliderValue),
    currentValue: outputValue
  }

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/stream.mp4")

    const audio = audioRef.current

    audio.addEventListener("timeupdate", () => {
      setAudioTime(audio.currentTime)
    })

    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(audio.duration)
    })

    audio.addEventListener("ended", () => {
      setIsPlaying(false)
    })

    return () => {
      audio.pause()
      audio.src = ""
    }
  }, [])

  // Update volume when slider changes or curve type changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = outputValue
    }
  }, [outputValue])

  // Handle dark mode toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Initialize theme based on user preference
  useEffect(() => {
    // Check user preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDarkMode(prefersDark)
  }, [])

  // Play/pause toggle
  const togglePlayback = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }

    setIsPlaying(!isPlaying)
  }

  // Mute toggle
  const toggleMute = () => {
    if (!audioRef.current) return

    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  // Format time for display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 max-w-4xl mx-auto w-full py-10 relative">
      {/* Theme toggle button */}
      <motion.div 
        className="absolute top-4 right-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          onClick={toggleTheme}
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-900/10 border-gray-300 dark:border-gray-800 hover:bg-gray-300 dark:hover:bg-gray-800 transition-all"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isDarkMode ? "moon" : "sun"}
              initial={{ scale: 0.8, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0, rotate: 30 }}
              transition={{ duration: 0.2 }}
            >
              {isDarkMode ? (
                <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Sun className="h-5 w-5 text-amber-500" />
              )}
            </motion.div>
          </AnimatePresence>
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
          VolumeX</h1>
          <h2 className="text-lg text-gray-700 dark:text-gray-100">Precision at low levels, power when you need it</h2>
          
        <p className="text-sm text-gray-500 dark:text-gray-400">The most optimal volume.control for music applications.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full"
      >
        <Card className="w-full border-gray-200 dark:border-none bg-gray-50 dark:bg-black">
          <CardContent className="pt-6">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="exponentialGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ffcbc4" />
                      <stop offset="50%" stopColor="#ff9a9e" />
                      <stop offset="100%" stopColor="#ff6b6b" />
                    </linearGradient>
                    <radialGradient id="dotGradient">
                      <stop offset="0%" stopColor="#ff6b6b" />
                      <stop offset="100%" stopColor="#ffcbc4" />
                    </radialGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="linearValue"
                    type="number"
                    domain={[0, 1]}
                    ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                    tickFormatter={(value) => value.toFixed(1)}
                    label={{ value: "Slider Position", position: "insideBottom", offset: -10 }}
                    stroke={isDarkMode ? "#a0a0a0" : "#666666"}
                  />
                  <YAxis
                    domain={[0, 1]}
                    ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                    tickFormatter={(value) => value.toFixed(1)}
                    label={{ value: "Volume Output", angle: -90, position: "insideLeft", offset: -5,dy: 50 }}
                    stroke={isDarkMode ? "#a0a0a0" : "#666666"}
                  />
                  <Tooltip
                    formatter={(value: number) => value.toFixed(2)}
                    labelFormatter={(value) => `Slider: ${Number.parseFloat(value.toString()).toFixed(2)}`}
                    contentStyle={{
                      backgroundColor: isDarkMode ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)",
                      borderColor: isDarkMode ? "#333333" : "#e0e0e0",
                      borderRadius: "6px",
                    }}
                    itemStyle={{ color: isDarkMode ? "#e0e0e0" : "#333333" }}
                    labelStyle={{ color: isDarkMode ? "#a0a0a0" : "#666666" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="exponentialValue"
                    stroke="url(#exponentialGradient)"
                    strokeWidth={3}
                    dot={false}
                    name="Exponential Curve"
                    animationDuration={1500}
                    opacity={useExponential ? 1 : 0.3}
                  />
                  
                  {/* Linear curve */}
                  <Line
                    type="monotone"
                    dataKey="linearValue"
                    stroke="#a0a0a0" // Gray for linear
                    strokeWidth={3}
                    dot={false}
                    name="Linear Curve"
                    animationDuration={1500}
                    opacity={useExponential ? 0.3 : 1}
                  />

                  {/* Current point highlight */}
                  <Line
                    data={[currentPoint]}
                    type="monotone"
                    dataKey="currentValue"
                    stroke="none"
                    strokeWidth={0}
                    dot={{ 
                      r: 6, 
                      fill: useExponential ? "url(#dotGradient)" : "#a0a0a0", 
                      stroke: isDarkMode ? "#000" : "#fff", 
                      strokeWidth: 2 
                    }}
                    name="Current Value"
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      
      {/* Add toggle switch for curve type */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="w-full"
      >
        <Card className="border-gray-200 dark:border-none bg-gray-50 dark:bg-black p-4 justify-center flex items-center flex-col">
        <div className="flex items-center justify-center gap-4">
            <Label htmlFor="curve-toggle" className="text-sm text-gray-600 dark:text-gray-400">Normal</Label>
            <Switch
              id="curve-toggle"
              checked={useExponential}
              onCheckedChange={setUseExponential}
              className="peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-400 dark:data-[state=unchecked]:bg-gray-600"
            />
            <Label htmlFor="curve-toggle" className="text-sm text-gray-600 dark:text-gray-400">VolumeX</Label>
          </div>
        <div className="w-full max-w-2xl mt-2 items-center">
        <Card className=" bg-gray-50 dark:bg-black">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {useExponential 
                ? "This volume control uses a curve that matches how human hearing works. This provides finer control at lower volumes and smooth scaling to maximum when needed."
                : "This volume control uses a linear curve where the volume output directly matches the slider position. This provides consistent changes across the entire range."}
            </p>
          </CardContent>
        </Card>
      </div>
          
        </Card>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="w-full"
      >
        <Card className="border-gray-200 dark:border-none bg-gray-50 dark:bg-black p-6">
          <div className="flex flex-col gap-6">
            {/* Audio player controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={togglePlayback}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-gray-100 dark:bg-[#ffcbc4]/20 border-gray-300 dark:border-[#ffcbc4]/20 hover:bg-gray-200 dark:hover:bg-[#ffcbc4]/50 transition-all"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isPlaying ? "pause" : "play"}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4 text-gray-700 dark:text-white" />
                      ) : (
                        <Play className="h-4 w-4 text-gray-700 dark:text-white" />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </Button>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700 dark:text-white flex items-center gap-1.5">
                    <Music className="h-3.5 w-3.5" /> Never Let You Go by lvly
                  </span>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(audioTime)} / {formatTime(audioDuration || 0)}
                  </div>
                </div>
              </div>

              <Button
                onClick={toggleMute}
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-[#ffcbc4]/20 transition-all"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isMuted ? "muted" : "unmuted"}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-gray-700 dark:text-white" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </Button>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-300 dark:bg-[#ffcbc4]/20 h-1.5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gray-600 dark:bg-[#ffcbc4]"
                style={{
                  width: `${(audioTime / (audioDuration || 1)) * 100}%`,
                }}
                transition={{ ease: "linear" }}
              />
            </div>


            {/* Value displays */}
            <div className="flex justify-center gap-6 flex-wrap mt-2">
              {/* Volume slider */}
            <motion.div 
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }} className="flex items-center w-1/2 justify-center gap-4 mt-2 p-3 bg-gray-200 dark:bg-[#ffcbc4]/10 rounded-lg border border-gray-200">
              <span className="text-sm font-medium text-primary dark:text-gray-400 flex items-center gap-1.5">
                <VolumeX className="h-4 w-4" />
              </span>
              <Slider
                value={[sliderValue]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(values) => {
                  setSliderValue(values[0])
                }}
                className="w-1/2"
              />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                <Volume2 className="h-4 w-4" />
              </span>
            </motion.div>
              <motion.div
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                className="bg-gray-200 dark:bg-[#ffcbc4]/10 border border-gray-300 dark:border-[#ffcbc4]/20 rounded-lg p-4 w-36"
              >
                <div className="text-xs uppercase font-medium text-center text-gray-600 dark:text-gray-500 mb-1">SLIDER VALUE</div>
                <div className="text-2xl font-bold text-center text-gray-700 dark:text-gray-200">{sliderValue.toFixed(2)}</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                className="bg-gray-200 dark:bg-[#ffcbc4]/10 border border-gray-300 dark:border-[#ffcbc4]/20 rounded-lg p-4 w-36"
              >
                <div className="text-xs uppercase font-medium text-center text-gray-600 dark:text-gray-500 mb-1">VOLUME OUTPUT</div>
                <div className="text-2xl font-bold text-center text-gray-700 dark:text-white">{outputValue.toFixed(2)}</div>
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>
      
      

      
    </div>
  )
}

