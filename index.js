const express = require('express')
const {Server}= require('socket.io')
const {createServer} = require('node:http')
const {join} = require('node:path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const { getRandomValues } = require('node:crypto')
// const cors = require('cors')

// const options = {key: fs.readFileSync('/home/mitch/Lo`calL`ibraryApp/cert/privkey.pem'),
//     cert: fs.readFileSync('/home/mitch/LocalLibraryApp/cert/fullchain.pem')
// }

async function main(){
    const randArr = new Uint16Array(32768)
    getRandomValues(randArr)
    let seed = -1

    const port = process.env.PORT || 3700

    const db = await open({
        filename: 'sqlite.db',
        driver: sqlite3.Database
    })
    // await db.exec('DELETE FROM messages;')
    // await db.exec('DELETE FROM SQLITE_SEQUENCE WHERE name=\'messages\'')
    await db.exec(`
        CREATE TABLE IF NOT EXISTS messages(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room TEXT UNIQUE,
            client_offset TEXT UNIQUE,
            content TEXT
        );`)

    const app = express()
    // app.use(cors())
    const server = createServer(app)
    server.listen(port,{cors: {origin:['http://localhost:3700']}})
    const io = new Server(server,{
        connectionStateRecovery:{
            // maxDisconnectionDuration: 2 * 60 * 1000,
            // skipMiddlewares: true,
        }
    })

    // app.set('port',port)
    // app.set('views',__dirname + '/views')
    // app.set('view engine', 'pug')
    // app.engine('pug',require('pug').__express)
    app.get('/',function(req,res){
        res.sendFile(join(__dirname,'index.html'))
    })

    io.on('connection',async (socket)=>{
        socket.on('chat message',async (msg,clientOffset,callback)=>{
            let result
            ++seed
            
            try{
                result = await db.run(
                    'INSERT INTO MESSAGES (content, client_offset) VALUES (?, ?)',
                    msg,clientOffset+`${randArr[seed]}`//, socket.rooms
                )
            }catch(e){
                if(e.errno === 19){
                    socket.emit('chat message','SQLITE_CONSTRAINT')
                }
                console.log(e)
                return
            }
            io.to('Room3').emit('chat message',msg,result.lastID)
            callback({status: 'sent'})
        })

        if(!socket.recovered){
            try {
                await db.each('SELECT id, content FROM messages WHERE id > ?',
                    [socket.handshake.auth.serverOffset || 0],
                    (_err,row)=>{
                        if(_err){
                            console.log(_err)
                            return
                        }
                        socket.emit('chat message', row.content, row.id)
                    }
                )
            } catch (e) {
                console.log(e)
                return
            }
        }
        
        console.log('User connected')
        io.emit('connected', socket.id,(resp)=>{
            console.log(resp.status)
        })

        socket.on('join room',(roomName,callback)=>{
            socket.rooms.forEach
            socket.join(roomName)
            console.log(socket.rooms)
            callback({status: `joined ${roomName}`})
        })
        
        socket.on('disconnect',()=>{
            console.log('User disconnected')
        })
    })
}

main()