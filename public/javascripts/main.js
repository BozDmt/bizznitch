let counter = 0

const socket = io({
    auth:{
    serverOffset: 0
    },
    ackTimeout: 1000,
    retries: 3,
})

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const disconnectBtn = document.getElementById('disconnect')
const roomBtns = document.querySelector('.rooms')
const rooms = document.querySelectorAll('.roomBtn')

disconnectBtn.addEventListener('click',(e)=>{
    e.preventDefault()
    if(socket.connected){
        disconnectBtn.innerText = 'Connect'
        socket.disconnect()
    }else{
        disconnectBtn.innerText = 'Disconnect'
        socket.connect()
    }
})

roomBtns.addEventListener('click',(e)=>{
    const btName = {name: e.target.getAttribute('name'), id: e.target.getAttribute('id')}
        
    socket.emit('join room',e.target.innerHTML,btName.name,(err,rsp)=>{
        if(err){
            console.log('error joining room')
        }else{
            console.log(rsp.status)
        }
    })

    if(e.target.tagName === 'BUTTON'){
        e.target.innerHTML = e.target.innerHTML === btName.name ? 'Leave Room' : btName.name
        if(e.target.innerHTML === 'Leave Room'){
            e.target.setAttribute('occupied','true') 

            rooms.forEach((room)=>{
                if(room.getAttribute('name') != btName.name && room.getAttribute('name') != 'Leave Room'){
                    room.style.visibility = 'hidden'
                }
            })
        }else{
            e.target.setAttribute('occupied','false')
            messages.textContent = ''
            rooms.forEach((room)=>{
                room.style.visibility = 'visible'
            })
        }
    }
})

form.addEventListener('submit', (e) => {
        e.preventDefault()
    if (input.value) {
        const clientOffset = `${socket.id}-`
        let roomName = ''
        const roomsArr = Array.from(rooms)
            
        for(const room of roomsArr){
            if(room.getAttribute('occupied') === 'true'){
                roomName = room.getAttribute('name')
                break
            }
        }
        
        socket.emit('chat message', roomName, input.value, clientOffset,
            (err,resp)=>{
            if(err){
                console.log(err)
            }else{
                console.log(resp.status)
            }
            })
        input.value = ''
    }
})  

socket.on('chat message',(msg, serverOffset)=>{
    const item = document.createElement('li')
    item.textContent = msg
    messages.appendChild(item)
    window.scrollTo(0,document.body.scrollHeight)
    socket.auth.serverOffset = serverOffset
})

// socket.on('connected',(socketId,callback)=>{
//     const idItem = document.createElement('li')
//     idItem.textContent = `socket ID: ${socketId}`
//     messages.appendChild(idItem)
//     window.scrollTo(0,document.body.scrollHeight)
// })
