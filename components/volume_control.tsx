"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, Play, Pause, Music, Sun, Moon, Waves } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// Add type definition for cross-browser AudioContext
interface Window {
  webkitAudioContext: typeof AudioContext;
}

export default function SmartVolume() {
  // Audio refs and state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const preampNodeRef = useRef<GainNode | null>(null)
  const filterNodesRef = useRef<BiquadFilterNode[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [audioTime, setAudioTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isEqEnabled, setIsEqEnabled] = useState(false)

  // Add new state for curve type
  const [useExponential, setUseExponential] = useState(true)
  
  // Add dark mode state
  const [isDarkMode, setIsDarkMode] = useState(true)

  // Add new state for EQ visualizer
  const [showEqVisualizer, setShowEqVisualizer] = useState(false)

  // Parametric EQ band settings: (frequency, gain_db, Q)
  const eqBands = [
    [50.0, 12.1, 8.2],
    [100.0, -5.2, 9.2],
    [326.6, 4.0, 6.3],
    [793.7, -5.0, 9.0],
    [2181.0, 3.7, 5.6],
    [7781.0, 7.8, 8.5]
  ]

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

  // Generate EQ frequency response data for visualization
  const generateEqResponseData = () => {
    // Calculate the frequency response for visualization
    const freqData = [];
    const minFreq = 20;
    const maxFreq = 20000;
    
    // Generate logarithmically spaced frequency points
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const freq = minFreq * Math.pow(maxFreq / minFreq, t);
      
      // Calculate the combined response at this frequency
      let response = 0;
      
      // Sum the response of all filters (simplified biquad approximation)
      if (isEqEnabled) {
        eqBands.forEach(([filterFreq, filterGain, filterQ]) => {
          // Simple approximation of biquad filter response
          const octaveWidth = 1.0 / filterQ;
          const octaveDistance = Math.abs(Math.log2(freq / filterFreq));
          
          // Apply bell curve approximation 
          if (octaveDistance < 2 * octaveWidth) {
            const attenuation = Math.cos(Math.PI * octaveDistance / (2 * octaveWidth));
            response += filterGain * attenuation * attenuation;
          }
        });
      }
      
      freqData.push({
        frequency: freq,
        response: response,
        flat: 0 // Reference line
      });
    }
    
    return freqData;
  };
  
  // Recalculate response curve when EQ status changes
  const eqResponseData = useMemo(() => generateEqResponseData(), [isEqEnabled, eqBands]);
  
  // Function to format frequency labels
  const formatFrequency = (freq: number): string => {
    if (freq >= 1000) {
      return `${(freq/1000).toFixed(0)}k`;
    }
    return freq.toFixed(0);
  };

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/HopeNF.mp3")

    const audio = audioRef.current

    // Initialize Web Audio API context and nodes
    try {
      // Create Audio Context if it doesn't exist yet
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        audioContextRef.current = new AudioContext()
        console.log("AudioContext created:", audioContextRef.current.state)
      }

      const context = audioContextRef.current
      
      // Only create the source node once
      if (!sourceNodeRef.current) {
        sourceNodeRef.current = context.createMediaElementSource(audio)
        console.log("Source node created")
      }
      
      const source = sourceNodeRef.current
      
      // Create gain node if it doesn't exist
      if (!gainNodeRef.current) {
        gainNodeRef.current = context.createGain()
        gainNodeRef.current.gain.value = outputValue
        console.log("Gain node created with value:", outputValue)
      }
      
      // Create preamp node if it doesn't exist (for EQ enhancement)
      if (!preampNodeRef.current) {
        preampNodeRef.current = context.createGain()
        preampNodeRef.current.gain.value = 1.0 // Unity gain by default
        console.log("Preamp node created")
      }
      
      const gainNode = gainNodeRef.current
      const preampNode = preampNodeRef.current
      
      // Create filter nodes for each EQ band if they don't exist
      if (filterNodesRef.current.length === 0) {
        filterNodesRef.current = eqBands.map(([frequency, gain, q]) => {
          const filter = context.createBiquadFilter()
          filter.type = 'peaking'
          filter.frequency.value = frequency
          filter.gain.value = 0 // Start with zero gain
          filter.Q.value = q
          return filter
        })
        console.log("Created", filterNodesRef.current.length, "EQ filter nodes")
      }
      
      // Connect source to gain node, and gain node to destination (bypassing filters initially)
      // Disconnect first to avoid duplicate connections
      try {
        source.disconnect()
        preampNode.disconnect()
        gainNode.disconnect()
      } catch (e) {
        // Ignore disconnection errors
      }
      
      // Standard connection path (no EQ)
      source.connect(preampNode)
      preampNode.connect(gainNode)
      gainNode.connect(context.destination)
      
      console.log("Audio nodes connected:", source.channelCount, "channels")
      
      // Resume audio context to ensure it's in running state (needed for some browsers)
      if (context.state === 'suspended') {
        context.resume().then(() => {
          console.log("AudioContext resumed successfully")
        })
      }
    } catch (error) {
      console.error("Web Audio API initialization failed:", error)
    }

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
      
      // Clean up audio context and connections
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Toggle the equalizer on/off
  const toggleEqualizer = () => {
    console.log("Toggle EQ button clicked, current state:", isEqEnabled)
    
    if (!audioContextRef.current || !sourceNodeRef.current || !gainNodeRef.current || !preampNodeRef.current) {
      console.error("Audio nodes not initialized, cannot toggle EQ")
      return
    }
    
    const source = sourceNodeRef.current
    const gainNode = gainNodeRef.current
    const preampNode = preampNodeRef.current
    const context = audioContextRef.current
    const filters = filterNodesRef.current
    
    // Ensure the audio context is running (needed for Safari and mobile browsers)
    if (context.state === 'suspended') {
      context.resume().then(() => {
        console.log("AudioContext resumed before EQ toggle")
        applyEqualizer(!isEqEnabled)
      }).catch(err => {
        console.error("Failed to resume AudioContext:", err)
      })
    } else {
      applyEqualizer(!isEqEnabled)
    }
  }
  
  // Apply or remove equalizer effect
  const applyEqualizer = (shouldEnable: boolean) => {
    if (!sourceNodeRef.current || !gainNodeRef.current || !audioContextRef.current || 
        !preampNodeRef.current || filterNodesRef.current.length === 0) {
      console.error("Cannot apply equalizer - audio nodes not initialized")
      return
    }
    
    const source = sourceNodeRef.current
    const gainNode = gainNodeRef.current
    const preampNode = preampNodeRef.current
    const filters = filterNodesRef.current
    
    try {
      // First disconnect all existing connections
      try {
        source.disconnect()
        preampNode.disconnect()
        filters.forEach(filter => filter.disconnect())
      } catch (e) {
        console.log("Error during disconnection:", e)
      }
      
      if (shouldEnable) {
        // Enabling EQ
        console.log("Enabling EQ with", filters.length, "filter nodes")
        
        // Apply the EQ gain values immediately with a short ramp time
        eqBands.forEach(([_, gain, __], i) => {
          if (filters[i]) {
            // Apply gain with a tiny ramp time for smoother transition
            filters[i].gain.setTargetAtTime(gain, audioContextRef.current!.currentTime, 0.02);
          }
        });
        
        // Boost preamp slightly to compensate for EQ and make changes more noticeable
        preampNode.gain.setTargetAtTime(1.4, audioContextRef.current!.currentTime, 0.02);
        
        // Connect source through filters in series
        source.connect(filters[0])
        for (let i = 0; i < filters.length - 1; i++) {
          filters[i].connect(filters[i + 1])
          console.log(`Connected filter ${i} to filter ${i+1}`)
        }
        // Connect last filter to gain node
        filters[filters.length - 1].connect(gainNode)
        console.log("Connected last filter to gain node")
      } else {
        // Disabling EQ
        console.log("Disabling EQ")
        
        // Reset preamp to unity gain
        preampNode.gain.setTargetAtTime(1.0, audioContextRef.current!.currentTime, 0.02);
        
        // Reset all filter gains to zero gradually
        filters.forEach(filter => {
          filter.gain.setTargetAtTime(0, audioContextRef.current!.currentTime, 0.02);
        });
        
        // Reconnect direct path
        source.connect(preampNode)
        preampNode.connect(gainNode)
        console.log("Reconnected source directly to gain node")
      }
      
      setIsEqEnabled(shouldEnable)
      console.log("EQ state set to:", shouldEnable)
      
      // If audio is playing, make sure changes take effect immediately
      if (isPlaying && audioRef.current) {
        // Small volume fluctuation to trigger audio pipeline update
        const currentVolume = audioRef.current.volume;
        const newVolume = Math.max(0.01, Math.min(0.99, currentVolume + (currentVolume > 0.5 ? -0.01 : 0.01)));
        audioRef.current.volume = newVolume;
        setTimeout(() => {
          if (audioRef.current) audioRef.current.volume = currentVolume;
        }, 50);
      }
    } catch (error) {
      console.error("Error applying equalizer:", error)
    }
  }

  // Update volume when slider changes or curve type changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = outputValue
    }

    // Also update gain node if using Web Audio API
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = outputValue
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

    // Handle special case of first click/initialization
    if (!isPlaying && (!audioContextRef.current || audioContextRef.current.state === 'suspended')) {
      // Force initialize audio context on first play
      try {
        if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext
          audioContextRef.current = new AudioContext()
          console.log("AudioContext created on play:", audioContextRef.current.state)
          
          const audio = audioRef.current
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio)
          console.log("Source node created on play")
          
          // Create preamp node for EQ enhancement
          preampNodeRef.current = audioContextRef.current.createGain()
          preampNodeRef.current.gain.value = 1.0 // Unity gain by default
          console.log("Preamp node created on play")
          
          gainNodeRef.current = audioContextRef.current.createGain()
          gainNodeRef.current.gain.value = outputValue
          console.log("Gain node created on play with value:", outputValue)
          
          filterNodesRef.current = eqBands.map(([frequency, gain, q]) => {
            const filter = audioContextRef.current!.createBiquadFilter()
            filter.type = 'peaking'
            filter.frequency.value = frequency
            filter.gain.value = isEqEnabled ? gain : 0 // Apply gain if EQ is enabled
            filter.Q.value = q
            return filter
          })
          
          // Connect either direct path or through EQ based on current setting
          const source = sourceNodeRef.current
          const preamp = preampNodeRef.current
          const gainNode = gainNodeRef.current
          
          if (isEqEnabled && filterNodesRef.current.length > 0) {
            // EQ enabled path
            preamp.gain.value = 1.2; // Boost preamp
            source.connect(filterNodesRef.current[0])
            for (let i = 0; i < filterNodesRef.current.length - 1; i++) {
              filterNodesRef.current[i].connect(filterNodesRef.current[i + 1])
            }
            filterNodesRef.current[filterNodesRef.current.length - 1].connect(gainNode)
          } else {
            // Direct path (no EQ)
            source.connect(preamp)
            preamp.connect(gainNode)
          }
          
          gainNode.connect(audioContextRef.current.destination)
        }
        
        // Resume the audio context (needed for autoplay policy)
        audioContextRef.current.resume().then(() => {
          console.log("AudioContext resumed on play button")
          playAudio()
        }).catch(err => {
          console.error("Error resuming audio context:", err)
          // Try playing anyway
          playAudio()
        })
      } catch (error) {
        console.error("Error initializing Web Audio API on play:", error)
        // Fall back to standard HTML5 audio
        playAudio()
      }
    } else {
      // Normal play/pause toggle
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        playAudio()
      }
    }
  }
  
  // Helper function to play audio
  const playAudio = () => {
    if (!audioRef.current) return
    
    audioRef.current.play().then(() => {
      setIsPlaying(true)
      console.log("Audio playback started successfully")
    }).catch(err => {
      console.error("Failed to play audio:", err)
      alert("Failed to play audio. Please try clicking the play button again.")
      setIsPlaying(false)
    })
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

      {/* Volume curve graph */}
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
      
      {/* Add toggle switches for curve type and EQ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="w-full"
      >
        <Card className="border-gray-200 dark:border-none bg-gray-50 dark:bg-black p-4 justify-center flex items-center flex-col">
          <div className="flex items-center justify-center gap-8">
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
            
            <div className="flex items-center justify-center gap-4">
              <Label htmlFor="eq-toggle" className="text-sm text-gray-600 dark:text-gray-400">EQ Off</Label>
              <Switch
                id="eq-toggle"
                checked={isEqEnabled}
                onCheckedChange={toggleEqualizer}
                className="peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-400 dark:data-[state=unchecked]:bg-gray-600"
              />
              <Label htmlFor="eq-toggle" className={`text-sm ${isEqEnabled ? 'text-[#ff6b6b] font-medium' : 'text-gray-600 dark:text-gray-400'} flex items-center gap-1.5`}>
                <Waves className={`h-4 w-4 ${isEqEnabled ? 'text-[#ff6b6b]' : ''}`} /> Bass Boost
                {isEqEnabled && <span className="inline-block h-2 w-2 rounded-full bg-[#ff6b6b] animate-pulse ml-1"></span>}
              </Label>
            </div>
            
            {/* Debug button - hidden in production */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-4 bottom-2 opacity-50 hover:opacity-100 text-xs"
              onClick={() => {
                console.log("Debug info:");
                console.log("Audio context state:", audioContextRef.current?.state);
                console.log("Source node:", sourceNodeRef.current);
                console.log("Gain node:", gainNodeRef.current);
                console.log("Filters:", filterNodesRef.current);
                console.log("EQ enabled:", isEqEnabled);
                console.log("Audio playing:", isPlaying);
                
                // Try to force start audio context
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                  audioContextRef.current.resume();
                }
                
                alert("Debug info logged to console. Check browser developer tools.");
              }}
            >
              Debug
            </Button>
          </div>

          <div className="w-full max-w-2xl mt-2 items-center">
            <Card className={`bg-gray-50 dark:bg-black ${isEqEnabled ? 'border border-[#ff6b6b]/30' : ''}`}>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {useExponential 
                    ? "This volume control uses a curve that matches how human hearing works. This provides finer control at lower volumes and smooth scaling to maximum when needed."
                    : "This volume control uses a linear curve where the volume output directly matches the slider position. This provides consistent changes across the entire range."}
                  {isEqEnabled && <span className="text-[#ff6b6b] ml-1">Audio EQ is active with a 6-band parametric equalizer for enhanced bass and clarity.</span>}
                </p>
              </CardContent>
            </Card>
          </div>
        </Card>
      </motion.div>
      
      {/* Add EQ Visualizer (always visible) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="w-full"
      >
        <Card className={`w-full border-gray-200 dark:border-none bg-gray-50 dark:bg-black ${isEqEnabled ? 'border-l-4 border-l-[#ff6b6b]' : ''}`}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className={`text-sm font-medium ${isEqEnabled ? 'text-[#ff6b6b]' : 'text-gray-700 dark:text-gray-300'} flex items-center gap-2`}>
                <Waves className={`h-4 w-4 ${isEqEnabled ? 'text-[#ff6b6b]' : ''}`} /> 
                EQ Frequency Response
                {isEqEnabled && <span className="inline-block h-2 w-2 rounded-full bg-[#ff6b6b] animate-pulse"></span>}
              </h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${isEqEnabled ? 'text-[#ff6b6b] font-medium' : 'text-gray-500'}`}>
                  {isEqEnabled ? 'EQ ENABLED' : 'EQ DISABLED'}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setShowEqVisualizer(!showEqVisualizer)}
                >
                  {showEqVisualizer ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>
            </div>
            
            <div className="w-full h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={eqResponseData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="eqGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="50%" stopColor="#f472b6" />
                      <stop offset="100%" stopColor="#f87171" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis 
                    dataKey="frequency" 
                    type="number"
                    scale="log"
                    domain={[20, 20000]}
                    ticks={[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]}
                    tickFormatter={formatFrequency}
                    label={{ value: "Frequency (Hz)", position: "insideBottom", offset: -5 }}
                    stroke={isDarkMode ? "#a0a0a0" : "#666666"}
                  />
                  <YAxis 
                    domain={[-15, 20]}
                    ticks={[-15, -10, -5, 0, 5, 10, 15, 20]}
                    label={{ value: "Gain (dB)", angle: -90, position: "insideLeft" }}
                    stroke={isDarkMode ? "#a0a0a0" : "#666666"}
                  />
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(1)} dB`}
                    labelFormatter={(value) => `${formatFrequency(Number(value))} Hz`}
                    contentStyle={{
                      backgroundColor: isDarkMode ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)",
                      borderColor: isDarkMode ? "#333333" : "#e0e0e0",
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="flat" 
                    stroke="#888888" 
                    strokeWidth={1}
                    dot={false}
                    name="Flat Response"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="response" 
                    stroke={isEqEnabled ? "url(#eqGradient)" : "#bbbbbb"} 
                    strokeWidth={3}
                    strokeDasharray={isEqEnabled ? "0" : "5 5"}
                    dot={false}
                    name={isEqEnabled ? "Active EQ" : "Inactive EQ"}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Show the detailed EQ settings if expanded */}
            {showEqVisualizer && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {eqBands.map(([freq, gain, q], index) => (
                  <div key={index} className={`rounded p-2 text-xs ${isEqEnabled 
                    ? (gain > 0 ? 'bg-[#f87171]/10 border border-[#f87171]/30' : 'bg-[#6366f1]/10 border border-[#6366f1]/30') 
                    : 'bg-gray-100 dark:bg-gray-900/50'}`}>
                    <div className={`font-medium mb-1 ${isEqEnabled ? (gain > 0 ? 'text-[#f87171]' : 'text-[#6366f1]') : ''}`}>
                      Band {index + 1}
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Freq: {formatFrequency(freq)} Hz</span>
                      <span className={gain > 0 ? 'text-[#f87171]' : (gain < 0 ? 'text-[#6366f1]' : '')}>
                        {isEqEnabled ? `${gain > 0 ? '+' : ''}${gain.toFixed(1)} dB` : "0.0 dB"}
                      </span>
                      <span>Q: {q.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Audio player controls */}
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
                    <Music className="h-3.5 w-3.5" /> Hope by NF
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
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }} 
                className="flex items-center w-1/2 justify-center gap-4 mt-2 p-3 bg-gray-200 dark:bg-[#ffcbc4]/10 rounded-lg border border-gray-200"
              >
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

