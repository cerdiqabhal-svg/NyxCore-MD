import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import pino from 'pino'

const { state, saveCreds } = await useMultiFileAuthState('session')

async function startBot() {
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: ['NyxCore', 'Chrome', '1.0.0']
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'connecting') {
      console.log('⏳ Connecting to WhatsApp...')
    }

    if (connection === 'open') {
      console.log('✅ NyxCore Connected Successfully!')
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) startBot()
    }
  })

  sock.ev.on('creds.update', saveCreds)

  // 🔥 SAFE pairing (only once, outside loop)
  if (!sock.authState.creds.registered) {
    try {
      const phoneNumber = "234XXXXXXXXXX" // your number
      const code = await sock.requestPairingCode(phoneNumber)
      console.log(`\n🔥 NyxCore Pairing Code: ${code}\n`)
    } catch (err) {
      console.log("❌ Pairing failed, retrying in 10s...")
      setTimeout(startBot, 10000)
    }
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text
    const from = msg.key.remoteJid

    if (text === 'hi') {
      await sock.sendMessage(from, { text: '👋 Hello, I am NyxCore Bot!' })
    }

    if (text === 'menu') {
      await sock.sendMessage(from, {
        text: `🤖 *NyxCore Menu*
        
• hi
• menu`
      })
    }
  })
}

startBot()
