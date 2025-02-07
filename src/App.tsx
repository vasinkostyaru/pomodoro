import React, { useState, useEffect, useRef } from 'react'

// Интерфейс для предустановок таймера
interface Preset {
  focus: number
  break: number
}

const presets: Preset[] = [
  { focus: 20, break: 5 },
  { focus: 50 * 60, break: 10 * 60 },
  { focus: 90 * 60, break: 15 * 60 }
]

const App: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<number>(0)
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [remainingTime, setRemainingTime] = useState<number>(presets[selectedPreset].focus)
  const [isRunning, setIsRunning] = useState<boolean>(false)

  // Используем useRef для отслеживания времени последнего обновления,
  // чтобы таймер корректно учитывал разницу времени даже при переключении вкладок.
  const lastUpdateRef = useRef<number>(Date.now())

  // Загрузка сохранённого состояния из localStorage при монтировании компонента
  useEffect(() => {
    const savedState = localStorage.getItem('timerState')
    if (savedState) {
      const {
        selectedPreset: savedPreset,
        mode: savedMode,
        remainingTime: savedRemainingTime,
        isRunning: savedIsRunning,
        lastUpdate
      } = JSON.parse(savedState)
      setSelectedPreset(savedPreset)
      setMode(savedMode)
      setRemainingTime(savedRemainingTime)
      setIsRunning(savedIsRunning)
      if (lastUpdate) {
        const now = Date.now()
        const delta = Math.floor((now - lastUpdate) / 1000)
        setRemainingTime(prev => (prev - delta > 0 ? prev - delta : 0))
        lastUpdateRef.current = now
      }
    }
  }, [])

  // Сохранение состояния в localStorage при изменении ключевых переменных
  useEffect(() => {
    localStorage.setItem(
      'timerState',
      JSON.stringify({
        selectedPreset,
        mode,
        remainingTime,
        isRunning,
        lastUpdate: lastUpdateRef.current
      })
    )
  }, [selectedPreset, mode, remainingTime, isRunning])

  // Запускаем интервал обновления таймера, который корректно учитывает прошедшее время
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        const now = Date.now()
        const deltaSecs = Math.floor((now - lastUpdateRef.current) / 1000)
        if (deltaSecs > 0) {
          setRemainingTime(prev => {
            const newTime = prev - deltaSecs
            if (newTime <= 0) {
              clearInterval(interval)
              notifyCompletion(mode)
              if (mode === 'focus') {
                setMode('break')
                return presets[selectedPreset].break
              } else {
                setMode('focus')
                return presets[selectedPreset].focus
              }
            }
            return newTime
          })
          lastUpdateRef.current = now
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isRunning, mode, selectedPreset])

  // Запрос разрешения на отправку уведомлений при загрузке приложения
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleStart = () => {
    if (!isRunning) {
      lastUpdateRef.current = Date.now()
      setIsRunning(true)
    }
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    if (mode === 'focus') {
      setRemainingTime(presets[selectedPreset].focus)
    } else {
      setRemainingTime(presets[selectedPreset].break)
    }
  }

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetIndex = Number(e.target.value)
    setSelectedPreset(presetIndex)
    if (mode === 'focus') {
      setRemainingTime(presets[presetIndex].focus)
    } else {
      setRemainingTime(presets[presetIndex].break)
    }
    setIsRunning(false)
  }

  // Настройки для SVG-круга (анимация прогресса)
  const circleRadius = 80
  const circumference = 2 * Math.PI * circleRadius
  const totalTime = mode === 'focus' ? presets[selectedPreset].focus : presets[selectedPreset].break
  const progress = 1 - remainingTime / totalTime
  const strokeDashoffset = circumference * (1 - progress)

  // Функция для форматирования времени (MM:SS)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = time % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Функция для явного уведомления пользователя о завершении сессии
  const notifyCompletion = (currentMode: 'focus' | 'break') => {
    const message = `Сессия ${currentMode === 'focus' ? 'фокуса' : 'отдыха'} завершена!`;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Таймер Фокуса", { body: message });
    } else {
      alert(message);
    }
  }

  return (
    <div
      className="app-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}
    >
      <h1>Таймер Фокуса</h1>
      <select onChange={handlePresetChange} value={selectedPreset} style={{ marginBottom: '20px' }}>
        <option value={0}>25/5</option>
        <option value={1}>50/10</option>
        <option value={2}>90/15</option>
      </select>
      <div
        className="timer"
        style={{
          position: 'relative',
          width: '200px',
          height: '200px',
          margin: '20px'
        }}
      >
        <svg width="200" height="200">
          <circle cx="100" cy="100" r={circleRadius} fill="none" stroke="#eee" strokeWidth="10" />
          <circle
            cx="100"
            cy="100"
            r={circleRadius}
            fill="none"
            stroke="#f00"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem'
          }}
        >
          {formatTime(remainingTime)}
        </div>
      </div>
      <div
        className="controls"
        style={{
          display: 'flex',
          gap: '10px'
        }}
      >
        <button onClick={handleStart}>Старт</button>
        <button onClick={handlePause}>Пауза</button>
        <button onClick={handleReset}>Сброс</button>
      </div>
    </div>
  )
}

export default App