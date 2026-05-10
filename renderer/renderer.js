(function () {
  const State = { PLAYING: 'playing', PAUSING: 'pausing', ADMIN: 'admin' }

  const player = document.getElementById('player')
  const pauseOverlay = document.getElementById('pause-overlay')
  const pauseMsg = document.getElementById('pause-msg')
  const adminOverlay = document.getElementById('admin-overlay')

  const state = {
    current: State.PAUSING,
    videos: [],
    config: {},
    index: 0,
    volume: 1.0,
    pauseTimer: null
  }

  // --- Admin code buffer ---
  const adminBuffer = []
  const MAX_BUFFER = 30

  function checkAdminBuffer () {
    const typed = adminBuffer.join('')
    if (typed.endsWith(state.config.adminCode)) {
      adminBuffer.length = 0
      showAdminPrompt()
    }
  }

  function feedAdminBuffer (key) {
    if (key.length !== 1) return
    adminBuffer.push(key.toLowerCase())
    if (adminBuffer.length > MAX_BUFFER) adminBuffer.shift()
    checkAdminBuffer()
  }

  // --- State transitions ---
  function playVideo (index) {
    state.current = State.PLAYING
    state.index = index
    pauseOverlay.classList.add('hidden')
    player.src = state.videos[index]
    player.volume = state.volume
    player.play().catch(err => {
      window.kiosk.logError('Failed to play video ' + index + ': ' + err.message)
      skipToNext()
    })
  }

  function startPause (duration) {
    state.current = State.PAUSING
    player.pause()
    player.src = ''
    pauseMsg.textContent = state.config.pauseMessage || ''
    pauseOverlay.classList.remove('hidden')

    clearTimeout(state.pauseTimer)
    state.pauseTimer = setTimeout(() => {
      const next = (state.index + 1) % state.videos.length
      playVideo(next)
    }, duration !== undefined ? duration : state.config.pauseDuration)
  }

  function skipToNext () {
    clearTimeout(state.pauseTimer)
    startPause(state.config.skipPauseDuration)
  }

  function showAdminPrompt () {
    clearTimeout(state.pauseTimer)
    player.pause()
    state.current = State.ADMIN
    adminOverlay.classList.remove('hidden')
  }

  function dismissAdminPrompt () {
    adminOverlay.classList.add('hidden')
    playVideo(state.index)
  }

  // --- Keyboard handling ---
  document.addEventListener('keydown', function (e) {
    if (state.current !== State.ADMIN) {
      feedAdminBuffer(e.key)
    }

    if (state.current === State.ADMIN) {
      if (e.key === 'Enter') {
        window.kiosk.confirmQuit()
      } else if (e.key === 'Escape') {
        dismissAdminPrompt()
      }
      return
    }

    switch (e.key) {
      case ' ':
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault()
        if (state.current === State.PLAYING) skipToNext()
        break
    }
  })

  // --- Video end ---
  player.addEventListener('ended', startPause)

  function shuffle (arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  // --- Initialization ---
  window.kiosk.onInit(function (data) {
    state.config = data.config
    state.videos = shuffle(data.videos.slice())
    state.volume = data.config.initialVolume

    if (state.videos.length === 0) {
      pauseMsg.textContent = 'No videos found in the videos/ folder.'
      pauseOverlay.classList.remove('hidden')
      return
    }

    playVideo(0)
  })
})()
