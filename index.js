const express = require('express')
const socket = require('socket.io')
const http = require('http')
const app = express()
const cors = require('cors')
const bp = require('body-parser')

app.use(bp.json())
app.use(cors())
var msgs = ['Ahh, sanka naaku, naa daggara levu', 'naa daggara levu ra hooka','dhoola theerindha','naa daggara levu ra macha,poraa reyy', 'neeku kaavalsina card, na gu lo undhi kaavaala']
const serv = http.createServer(app)
const io = socket.listen(serv)

const port = process.env.PORT|| 5000
console.log(port)
var rooms = []
var participants = []
var games = []
var uids = []
function create_room(room_id,socket){

    rooms[room_id] = {[socket.id]:{name:socket.name,room:room_id,uid:socket.uid,status:'online'}}
    uids[socket.uid] = {socket_id:socket.id,room_id:room_id,status:'created_room'}
}
function join_room(room_id,socket,fn){
    fn('joined')
    rooms[room_id][socket.id] = {name:socket.name,room:room_id,uid:socket.uid,status:'online'}
    io.to(room_id).emit('new_member_joined',{sockets:rooms[room_id]})
    uids[socket.uid] = {socket_id:socket.id,room_id:room_id,status:'joined_room'}
    if(Object.keys(rooms[room_id]).length==6){
        var gam = new game(room_id)
        games[room_id] = gam
    }
}

class player{
    constructor(id,team,name,room_id){
        this.id = id
        this.room_id = room_id
        this.cards = {}
        this.team = team
        this.name = name
        this.status = 'online'
    }


}

class game{
    constructor(id){
        this.deck = {}
        this.deck_ids = []
        this.id = id
        this.player_ids = Object.keys(rooms[id])
        this.sockets = rooms[id]
        this.players = {}
        this.score={'a':0,'b':0}
        this.is_finished = false
        this.winner = ''
        this.card_nums = {}
        this.game_over={'a':false,'b':false}
        this.current_turn = ''
        this.teams = {'a':{},'b':{}}
        this.form_deck()
        this.shuffle_deck()
        this.distribute_into_teams()
        this.distribute_cards()
        this.emit_data()
    }

    distribute_cards(){
        for(var i=0;i<=42;i=i+6){
            for(var j=0;j<6;j++){
                this.players[this.player_ids[j]].cards[this.deck_ids[i+j]]=this.deck[this.deck_ids[i+j]]
            }
        }
    }

    shuffle_deck() {
        for (let i = this.deck_ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck_ids[i], this.deck_ids[j]] = [this.deck_ids[j], this.deck_ids[i]];
        }
    }

    form_deck(){
        var symbols = ['spade','club','heart','diamond']
        var higher = ['K','Q','J','A']
        var weights = [13,12,11,1]
        for(var i=2;i<=10;i++){
            for(var j = 0;j<4;j++){
                if(i!=7){
                    var deck_cat = `${symbols[j]}_`
                    if(i<7){
                        deck_cat = deck_cat+'low'
                    }else{
                        deck_cat = deck_cat+'high'
                    }
                    this.deck[`${symbols[j]}_${i}`]={suit:symbols[j],value:`${i}`,weight:i,deck_cat:deck_cat}
                }
            }
        }
        for(var i=0;i<4;i++){
            for(var j=0;j<4;j++){
                var deck_cat = `${symbols[j]}_`
                    if(weights[i]<7){
                        deck_cat = deck_cat+'low'
                    }else{
                        deck_cat = deck_cat+'high'
                    }
                this.deck[`${symbols[j]}_${higher[i]}`]={suit:symbols[j],value:higher[i],weight:weights[i],deck_cat:deck_cat}
            }
        }
        this.deck_ids = Object.keys(this.deck)
    }

    distribute_into_teams(){
        for(var i=0;i<3;i++){
            var gamer = new player(this.player_ids[i],'a',this.sockets[this.player_ids[i]].name,this.id)
            this.players[this.player_ids[i]] = gamer
            this.teams['a'][this.player_ids[i]] = gamer
            this.sockets[this.player_ids[i]].team = 'a'
            rooms[this.id][this.player_ids[i]]['team'] = 'a'
            var uid  = rooms[this.id][this.player_ids[i]].uid
            uids[uid]['status'] = 'in the game'

        }
        for(var i=3;i<6;i++){
            var gamer = new player(this.player_ids[i],'b',this.sockets[this.player_ids[i]].name,this.id)
            this.players[this.player_ids[i]] = gamer
            this.teams['b'][this.player_ids[i]]=gamer
            this.sockets[this.player_ids[i]].team = 'b'
            rooms[this.id][this.player_ids[i]]['team'] = 'b'
            var uid  = rooms[this.id][this.player_ids[i]].uid
            uids[uid]['status'] = 'in the game'
        }
        
    }

    emit_data(){
        this.current_turn = this.player_ids[Math.floor(Math.random()*6)]
        for(var i=0;i<6;i++){
            this.card_nums[this.player_ids[i]] = 8
        }
        for(var i=0;i<6;i++){
            io.to(this.players[this.player_ids[i]].id).emit('init_player',{info:this.players[this.player_ids[i]],sockets:this.sockets,current:this.current_turn,teams:this.teams,card_nums:this.card_nums})
        }

    }

}

function get_rand_int(){
    return Math.floor(Math.random()*10)
}
function check_valid_deck(cards){
    var card_ids = Object.keys(cards)
    if(card_ids.length==6){
        var suit = card_ids[0].split("_")[0]
        var weight = cards[card_ids[0]].weight
        var cat = weight>7?'high':'low'
      for(var i=0;i<6;i++){
        var card = card_ids[i]
        if(cards[card].suit!=suit){
            return [false,null,null,null]
            break
        }
        if(cat=='high'){
          if(cards[card].weight<7){
            return [false,null,null,null]
            break
          }
        }else{
          if(cards[card].weight>7){
            return [false,null,null,null]
            break
          }
        }
      }
      return [true,suit,cat]
    }else{
        return [false,null,null,null]
    }
}
function cancel_deck(room_id,req_card,team_ids,other_team_ids){
    var gam = games[room_id]
    var deck_cat = gam.deck[req_card].deck_cat
    var rem_card_ids = []
    team_ids.forEach(id=>{
        var cards = gam.players[id].cards
        var temp_cards = []
        Object.keys(cards).forEach(card_id=>{
            if(cards[card_id].deck_cat==deck_cat){
                rem_card_ids.push(card_id)
                temp_cards.push(card_id)
            }
        })
        temp_cards.forEach(c=>{
            delete cards[c]
            gam.card_nums[id]-=1
        })
        gam.players[id].cards = cards
    })
    console.log(rem_card_ids)
    if(rem_card_ids.length==6){

    }else{
        console.log('in another team')
        other_team_ids.forEach(id=>{
            var cards = gam.players[id].cards
            var temp_cards = []
            Object.keys(cards).forEach(card_id=>{
                if(cards[card_id].deck_cat==deck_cat){
                    rem_card_ids.push(card_id)
                    temp_cards.push(card_id)
                    console.log(card_id)
                }
            })
            temp_cards.forEach(c=>{
                delete cards[c]
                gam.card_nums[id]-=1
            })
            gam.players[id].cards = cards
        })
        console.log(rem_card_ids)
    }   

}
function check_for_zero_cards(room_id,team_ids,other_team_ids,team,other_team,socket_id){
    var gam = games[room_id]
    var is_zero_team = true
    var is_zero_other = true
    var max_id = other_team_ids[0]
    var max = 0
    other_team_ids.forEach(id=>{
        if(gam.card_nums[id]>0){
            is_zero_other = false
        }
        if(gam.card_nums[id]>=max){
            max_id = id
            max = gam.card_nums[id]
        }
    })
    
    if(is_zero_other){
        gam.game_over[other_team] = true
        max_id = socket_id
        max = gam.card_nums[max_id]
        team_ids.forEach(id=>{
            if(gam.card_nums[id]>max){
                max = gam.card_nums[id]
                max_id = id
            }
        })        
    }
    team_ids.forEach(id=>{
        if(gam.card_nums[id]>0){
            is_zero_team = false
        }
    })
    gam.current_turn = max_id
    if(is_zero_team){
        gam.game_over[team]=true
    }

}
io.sockets.on('connection',(socket)=>{
    console.log('connected',socket.id)
    socket.on('disconnect',()=>{
        console.log(socket.id)
        if(socket.room_id){
            if(games[socket.room_id]){
                games[socket.room_id].sockets[socket.id].status = 'offline'
                io.to(socket.room_id).emit('member_disconnected',{sockets:games[socket.room_id].sockets})   
            }else if(rooms[socket.room_id]){
                try{
                    
                    delete rooms[socket.room_id][socket.id]
                      
                }catch(e){

                }
                try{
                    delete uids[socket.uid]  
                }catch(e){
                    
                }

                if(Object.keys(rooms[socket.room_id]).length==0){
                    delete rooms[socket.room_id]
                }else{
                    io.to(socket.room_id).emit('new_member_joined',{sockets:rooms[socket.room_id]})

                }
            }
        }
    })
    socket.on('sign_in',(data,fn)=>{
        socket.uid = data.uid
        console.log(socket.uid)
        fn('done')
    })
    socket.on('create_room',(data,fn)=>{
        var room_id = `${get_rand_int()}${get_rand_int()}${get_rand_int()}${get_rand_int()}${get_rand_int()}`
        socket.join(room_id,()=>{
            socket.name = data            
            console.log('created,joined',room_id)
            socket.room_id = room_id
            create_room(room_id,socket)
            fn(room_id)
            console.log(rooms[room_id])

            io.to(room_id).emit('new_member_joined',{sockets:rooms[room_id]})
        })
    })
    socket.on('join_room',(data,fn)=>{
        var room_id = data.room_id
        var name = data.name
        if(rooms[room_id]){
            if(Object.keys(rooms[room_id]).length<6){
                socket.join(room_id,()=>{
                    socket.room_id = room_id
                    socket.name = name
                    join_room(room_id,socket,fn)
                })
            }else{
                fn('full')
            }

        }else{
            socket.emit('invalid_room_id',()=>{

            })
        }

    })
    socket.on('update_socket',(data)=>{
        socket.team = data.team
    })
    socket.on('ask_card',(data,fn)=>{
        var to_socket = data.to_socket
        var cards = data.cards
        io.to(socket.room_id).emit('card_req_notif',{cards:cards,from:socket.id,to:to_socket})
        fn('requested')
    })
    socket.on('card_response',(data,fn)=>{
        var to_socket=data.to_socket
        var resp = data.resp
        var same_team = false
        if(socket.team == data.team){
            same_team = true
        }
        console.log(socket.team,data.team)
        if(resp=='yes'){
            var req_card = data.cards
            var from_cards = games[socket.room_id].players[socket.id].cards
            var to_cards = games[socket.room_id].players[to_socket].cards

            if(from_cards[req_card]){
                to_cards[req_card] = JSON.parse(JSON.stringify(from_cards[req_card]))
                delete from_cards[req_card]
            }
            var gam = games[socket.room_id]
            gam.players[to_socket].cards = to_cards
            gam.players[socket.id].cards = from_cards
            gam.card_nums[to_socket]+=1
            gam.card_nums[socket.id]-=1
            var team = gam.sockets[socket.id].team
            var team_ids = Object.keys(gam.teams[team])
            var is_zero = true
            team_ids.forEach(id=>{
                if(gam.card_nums[id]>0){
                    is_zero=false
                }
            })
            if(is_zero){
                gam.game_over[team] = true
            }
            gam.current_turn = to_socket
            io.to(to_socket).emit('cards_exchanged',{cards:to_cards})
            io.to(socket.id).emit('cards_exchanged',{cards:from_cards})
            io.to(socket.room_id).emit('cards_exchanged_notif',{from:socket.id,to:to_socket,cards:req_card,current:to_socket,exchanged:true,card_nums:gam.card_nums,game_over:gam.game_over,other_team:team})
            
            fn('done')
        }else{
            var req_card = data.cards
            var msg = Math.floor(Math.random()*msgs.length)
            games[socket.room_id].current_turn = socket.id

            if(same_team){

                var gam = games[socket.room_id]
                var team_ids = Object.keys(gam.teams[socket.team])
                var otherteam = socket.team=='a'?'b':'a'
                var otherteamids = Object.keys(gam.teams[otherteam])
                cancel_deck(socket.room_id,data.cards,team_ids,otherteamids)

                games[socket.room_id].score[otherteam]+=1
                check_for_zero_cards(socket.room_id,team_ids,otherteamids,socket.team,otherteam,to_socket)
                
                io.to(socket.room_id).emit('deck_cancelled',{deck_cat:gam.deck[data.cards].deck_cat,scores:gam.score,current:games[socket.room_id].current_turn})
                team_ids.forEach(id=>{
                    io.to(id).emit('cards_exchanged',{cards:gam.players[id].cards})
                })
                otherteamids.forEach(id=>{
                    io.to(id).emit('cards_exchanged',{cards:gam.players[id].cards})
                })
                
                if(gam.game_over['a'] && gam.game_over['b']){
                    io.to(socket.room_id).emit('game_over',{scores:gam.score})
                    var sock_ids = Object.keys(rooms[socket.room_id])
                    sock_ids.forEach(id=>{
                        var uid = rooms[socket.room_id][id].uid
                        delete uids[uid]
                    })
                    delete rooms[socket.room_id]
                    delete games[socket.room_id]
                }
            }else{
                io.to(socket.room_id).emit('cards_exchanged_notif',{exchanged:false,current:socket.id,msg:msgs[msg],from:socket.id,to:to_socket,cards:req_card})
            
            }
        }
    })
    socket.on('form_deck',(data,fn)=>{
        var cards = data.cards
        var team = data.team
        var boole = check_valid_deck(cards)
        console.log(team)
        console.log(boole)
        if(boole[0]){
            fn('done')
            var from_cards = games[socket.room_id].players[socket.id].cards
            var card_ids = Object.keys(cards)
            card_ids.forEach(card=>{
                delete from_cards[card]
            })
            var gam = games[socket.room_id]
            gam.players[socket.id].cards = from_cards
            gam.card_nums[socket.id] -= 6
            io.to(socket.id).emit('cards_exchanged',{cards:from_cards})
            var ids = Object.keys(gam.teams[team])
            var is_zero = true
            var max_id=socket.id
            var max =0
            if(gam.card_nums[socket.id]==0){
                ids.forEach(id=>{
                    if(gam.card_nums[id]>max){
                        max = gam.card_nums[id]
                        max_id = id
                    }    
                    if(gam.card_nums[id]>0){
                        is_zero = false
                    }
                })
                if(is_zero){
                    gam.game_over[team] = true
                    var other_team = team=='a'?'b':'a'
                    max = 0
                    var socks = Object.keys(gam.teams[other_team])
                    socks.forEach(id=>{
                        if(gam.card_nums[id]>=max){
                            max = gam.card_nums[id]
                            max_id = id
                        }
                    })
                }
            }
            gam.score[team] +=1
            gam.current_turn =  max_id
            io.to(socket.room_id).emit('deck_formed',{formed_by:socket.id,current:max_id,suit:boole[1],cat:boole[2],scores:gam.score,game_over:gam.game_over,card_nums:gam.card_nums,team:team})
            if(gam.game_over['a'] && gam.game_over['b']){
                io.to(socket.room_id).emit('game_over',{scores:gam.score})
                var sock_ids = Object.keys(rooms[socket.room_id])
                sock_ids.forEach(id=>{
                    var uid = rooms[socket.room_id][id].uid
                    delete uids[uid]
                })
                delete rooms[socket.room_id]
                delete games[socket.room_id]
            }
        }else{
            fn('invalid')
        }
    })
    socket.on('check_player',(data,fn)=>{
        var uid = data.uid
        console.log(uid)
        if(uid){
            var prev_socket = uids[uid]?uids[uid].socket_id:null
            var room_id = uids[uid]?uids[uid].room_id:null
            console.log(prev_socket,room_id)

            if(prev_socket==socket.id){

            }
            else if(prev_socket){
                socket.join(room_id,()=>{
                    
                })
                var status = uids[uid].status
                if(status=='created_room'){
                    console.log('created_room')
                    fn('created_room')
                }else if(status=='joined_room'){
                    fn('joined_room')
                }else if(status=='in the game'){
                    uids[uid]['socket_id'] = socket.id
                    var gam = games[room_id]
                    var play = JSON.parse(JSON.stringify(gam.players[prev_socket]))
                    var cards = play.cards
                    var new_play = new player(socket.id,play.team,play.name,play.room_id)
                    var card_nums = JSON.parse(JSON.stringify(gam.card_nums))
                    card_nums[socket.id] = card_nums[prev_socket]
                    socket.name = play.name
                    socket.room_id = play.room_id
                    socket.team = play.team
                    new_play.cards = cards
                    gam.players[socket.id] = new_play
                    gam.card_nums = card_nums

                    // console.log(gam.sockets[socket.id])
                    gam.sockets[socket.id] = {name:socket.name,team:socket.team,status:'online',room:room_id,uid:socket.uid}        
                    rooms[room_id][socket.id] = {name:play.name,room:room_id,uid:socket.uid,status:'online',team:socket.team}
                    gam.teams[play.team][socket.id] = new_play
                    // console.log(gam.sockets[prev_socket])
                    delete gam.players[prev_socket]
                    // console.log(gam.sockets[socket.id])
                    delete rooms[room_id][prev_socket]
                    // console.log(gam.sockets[socket.id])
                    delete gam.teams[play.team][prev_socket]
                    // console.log(gam.sockets[socket.id])
                    delete gam.card_nums[prev_socket]
                    // console.log(gam.sockets[socket.id])
                    delete gam.sockets[prev_socket]
                    // console.log(gam.sockets[socket.id])
            
                    gam.player_ids = Object.keys(rooms[room_id])
                    if(gam.current_turn==prev_socket){
                        gam.current_turn = socket.id
                    }
                    // console.log(gam.sockets)

                    io.to(room_id).emit('member_refreshed',{sockets:gam.sockets,teams:gam.teams,score:gam.score,current:gam.current_turn,card_nums:gam.card_nums})
                    io.to(socket.id).emit('resume',{info:gam.players[socket.id],game_over:gam.game_over,sockets:gam.sockets,teams:gam.teams,score:gam.score,current:gam.current_turn,card_nums:gam.card_nums})


                }
            }else{
                console.log('no room')
                fn('no_room')
            }
        }else{
            console.log('no room')
            fn('no_room')
        }
    })

})
serv.listen(port)



