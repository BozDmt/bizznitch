const express = require('express')
const {Server}= require('socket.io')
const {createServer} = require('node:http')
const {join} = require('node:path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const { getRandomValues } = require('node:crypto')
const path = require('path')
// const cors = require('cors')

// const options = {key: fs.readFileSync('/home/mitch/Lo`calL`ibraryApp/cert/privkey.pem'),
//     cert: fs.readFileSync('/home/mitch/LocalLibraryApp/cert/fullchain.pem')
// }

function setNoCacheHeaders(req,res,next){
    res.setHeader('Cache-Control','no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires','0')
    next()
}

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
    // app.use(setNoCacheHeaders)
    // app.use(cors({origin:['http://localhost:3700']}))
    app.use(express.static(path.join(__dirname,'public')))
    const server = createServer(app)
    server.listen(port)
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
        socket.on('chat message',async (room,msg,clientOffset,callback)=>{
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
            io.to(room).emit('chat message',msg,result.lastID)
            callback({status: 'sent'})
        })

        if(!socket.recovered){
            try {
                await db.each('SELECT id, content FROM messages WHERE id > ?',//'AND room = ?'
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

        socket.on('join room',(command,roomName,callback)=>{
            if(command === 'Leave Room'){
                socket.leave(roomName)
                callback({status: 'Left Room'})
            }else{
                socket.join(roomName)
                callback({status: `joined ${roomName}`})
            }
            console.log(socket.rooms)
        })
        
        socket.on('disconnect',()=>{
            console.log('User disconnected')
        })
    })
}

main()