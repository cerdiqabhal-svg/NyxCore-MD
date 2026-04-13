import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'

const { state, saveCreds } = await useMultiFileAuthState('session')

async function startBot() {
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false
  })

  // 🔥 Pairing Code
  sock.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect, qr } = update

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

  // 🔥 FIXED PAIRING CODE (delay)
  if (!sock.authState.creds.registered && connection === 'connecting') {
    const phoneNumber = "234XXXXXXXXXX" // 👉 your number
    setTimeout(async () => {
      const code = await sock.requestPairingCode(phoneNumber)
      console.log(`\n🔥 NyxCore Pairing Code: ${code}\n`)
    }, 4000)
  }
})

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('✅ NyxCore Connected Successfully!')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text
    const from = msg.key.remoteJid

    // 👇 Simple commands
    if (text === 'hi') {
      await sock.sendMessage(from, { text: '👋 Hello, I am NyxCore Bot!' })
    }

    if (text === 'menu') {
      await sock.sendMessage(from, {
        text: `🤖 *NyxCore Menu*
        
• hi
• menu

More commands coming soon...`
      })
    }
  })
}

startBot()
