import { WebSocket, WebSocketServer } from "ws";

type Registration = {
  id: string;
  name: string;
  token: string;
};

type PublicClient = {
  id: string;
  name: string;
}

type Ping = {
  id: string;
}

type Pong = {
  token: string;
  ping_id: string;
}

class ShrimpServer {
  wss: WebSocketServer;
  clientManager: ClientManager;
  roomManager: RoomManager;
  constructor() {
    this.clientManager = new ClientManager();
    this.roomManager = new RoomManager();
    this.wss = new WebSocketServer({ port: 8080 });
    this.wss.on("connection", (socket) => this._onConnection(socket));
  }

  _onConnection(ws: WebSocket) {
    console.log("New connection");
    ws.on("message", (data) => this._onMessage(ws, data));
  }

  _onMessage(ws: WebSocket, data: any) {
    try {
      const message = JSON.parse(data);
      switch (message.type) {
        case "register":
          console.log("Registering client...")
          this._onRegister(ws, {id: message.id, name: message.name, token: message.token});
          break;
        case "pong":
          this.clientManager.pong({token: message.token, ping_id:message.ping_id});
          break;
        default:
          console.log(message);
          break;
      }
    } catch (e) {
      // TODO handle error
    }
  }

  _onRegister(ws: WebSocket, reg: Registration) {
    var client = this.clientManager.addClient(new Client(reg.id, reg.name, reg.token, ws));
    ws.send(JSON.stringify({type:"registered", id: reg.id}));
    if(client) {
      this.roomManager.joinDefaultRoom(client);
    }
  }
}

class RoomManager {
  ROOMS: Map<string, Room>;
  DEFAULT_ROOM: Room;
  constructor() {
    this.ROOMS = new Map();
    this.DEFAULT_ROOM = new Room("default");
    this.addRoom(this.DEFAULT_ROOM);
  }

  addRoom(room: Room) {
    this.ROOMS.set(room.id, room);
  }

  joinDefaultRoom(client: Client) {
    this.DEFAULT_ROOM.join(client);
  }

}

class Room  {
  MEMBERS: Map<string, Client>;
  id: string;
  constructor(id=Utils.generateRoomId()) {
    this.id = id
    this.MEMBERS = new Map();
  }

  join(client: Client) {
    if(this.MEMBERS.has(client.id)) {return}
    this.MEMBERS.set(client.id, client);
    
    // inform new joined client of current members
    client.socket.send(JSON.stringify({type:"joined", room: this.id, members: this.getMembers()}));

    // inform other members of new member
    this.MEMBERS.forEach(c => {
      if(c.id !== client.id) {
        c.socket.send(JSON.stringify({type:"member-update", room: this.id, members: this.getMembers()}));
      }
    })
  }

  leave(client: Client) {
    this.MEMBERS.delete(client.id);

    // inform other members member leaved
    this.MEMBERS.forEach(c => {
      if(c.id !== client.id) {
        c.socket.send(JSON.stringify({type:"member-update", room: this.id, members: this.getMembers()}));
      }
    })
  }

  getMembers(){
    return Array.from(this.MEMBERS.values()).map(c => ({id: c.id, name: c.name}));
  }
}

class ClientManager {
  CLIENTS: Map<string, Client>;
  constructor() {
    this.CLIENTS = new Map();
    setInterval(() => {
      this.CLIENTS.forEach((client) => {
      // check if client is still connected
        if(client.isTimedOut()) {
          this._onClientOffline(client);
        }

      // ping client
        var id = Utils.generateRoomId()
        client.ping(id);
        //console.log("pinged client " + client.id + " with id " + id);
      })

    }, 1000)
  }

  addClient(client: Client) {
    if (this.CLIENTS.has(client.id)) {
      if (client.token == this.CLIENTS.get(client.id)?.token) {
        this.CLIENTS.set(client.id, client);
        console.log("reconnected client")
      } else {
        // TODO handle error
        return null
      }
    } else {
      this.CLIENTS.set(client.id, client);
      console.log("registered new client")
    }
    return this.CLIENTS.get(client.id);
  }

  _onClientOffline(client: Client) {
    this.CLIENTS.delete(client.id);
    console.log("client " + client.id + " timed out")
  }

  getClientById(id: string) {
    return this.CLIENTS.get(id);
  }

  getClientByToken(token: string): Client | null { 
    let c: Client | null = null; 
    this.CLIENTS.forEach((client) => {
      if(client.token == token) {
        c = client;
      } 
    })
    return c;
  }

  getClients() {
    let clients: PublicClient[] = []
    this.CLIENTS.forEach((client) => {
      clients.push({id: client.id, name: client.name})
    })
    return clients;
  }

  pong(pong: Pong) {
    var client = this.getClientByToken(pong.token);
    if(client != null) {
      //console.log("client anserd pong with id " + pong.ping_id);
      client.pong(pong.ping_id);
    } else {
      console.log("client not found")
    }
  }
}

class Client {
  id: string;
  name: string;
  token: string;
  socket: WebSocket;
  missedPings: number;
  online: boolean;
  open_pings: Map<string, Client>;

  constructor(id: string, name: string, token: string, socket: WebSocket) {
    this.id = id;
    this.name = name;
    this.token = token;
    this.socket = socket;
    this.missedPings = 0;
    this.online = true;
    this.open_pings = new Map();
  }

  ping(id:string) {
    this.socket.send(JSON.stringify({type: "ping", id: id}));
    this.open_pings.set(id, this);
  }

  pong(id:string) {
    this.open_pings.delete(id);
  }

  isTimedOut() {
    // TODO set open pings timeout
    return this.open_pings.size > 3;
  }

}

class Utils {
  static generateRoomId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

let server = new ShrimpServer();
console.log("Server started");
