import ExponentialCurveVisualization from "@/components/VolumeControl"

export default function Home() {
  return (
    <div>
      <div className="min-h-screen flex justify-center bg-background">
        <main className="container mx-auto py-8 px-4 min-h-screen flex flex-col justify-center items-center">
          <ExponentialCurveVisualization />
          
        </main>
        <div className="absolute bottom-4 text-center text-sm text-gray-400 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
        <a 
          href="https://bento.me/fixingx" 
          target="_blank" 
          rel="noopener noreferrer"
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          Made by Ajay Sharma
        </a>
      </div>
      </div>
    </div>
  )
}