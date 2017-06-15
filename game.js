let players = {};
let url = require('url');
let Room = require('./room');
let cookie = require('cookie');
let rooms = [];
let activeGames = [];

const TYPE_0 = 1;
const TYPE_X = 2;

class Game {
  constructor(room)
  {
    this.room = room;
    this.id = null;
    this.active = false;
    this.canAct = 1;
    this.gameProgress = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    this.player1 = room.player1;
    this.player2 = room.player2;
  }

  start()
  {
    this.active = true;
    if ((Math.random() - 0.5) > 0) {
      this.player1.type = 2;
      this.player2.type = 1;
    } else {
      this.player1.type = 1;
      this.player2.type = 2;
    }
    let cookie1 = [Game.serialize('gameId', this.id)];
    if (this.player1.needSendId) {
      cookie1.push(Game.serialize('id', this.player1.id));
    }
    this.player1.res.setHeader('Set-Cookie', cookie1);
    let cookie2 = [Game.serialize('gameId', this.id)];
    if (this.player2.needSendId) {
      cookie2.push(Game.serialize('id', this.player2.id));
    }
    this.player2.res.setHeader('Set-Cookie', cookie2);

    this.player1.res.end(JSON.stringify({
      type:     this.player1.type,
      progress: this.gameProgress,
      canAct:   this.player1.type === this.canAct,
      win:      false,
      oName:    this.player2.name,
    }));
    this.player2.res.end(JSON.stringify({
      type:     this.player2.type,
      progress: this.gameProgress,
      canAct:   this.player2.type === this.canAct,
      win:      false,
      oName:    this.player1.name,
    }));
  }

  static serialize(key, value) {
    return cookie.serialize(key, value, {httpOnly: true, path: '/', signed: true});
  }

  /**
   * @param roomId
   * @returns boolean
   */
  static canStartRoom(roomId)
  {
    if (rooms[roomId] instanceof Room) {
      return rooms[roomId].isFull();
    }
    return false;
  }

  static addToQueue(player, res)
  {
    let obj = {id: player.id, change: false};
    this.validateId(obj);
    console.log('addToQueue');
    console.log(obj.id);
    players[obj.id] = {
      id: obj.id,
      res: res,
      roomId: null,
      needSendId: obj.change,
      name: player.name,
    };
    return this.addToRoom(players[obj.id])
  }

  static validateId(obj)
  {
    if (!obj.id) {
      obj.id = 'p' + Math.floor((Math.random() * 100) + 1);
      obj.change = true;
    }
    if (players.hasOwnProperty(obj.id)) {
      if (obj.change) {
        this.validateId(obj);
      }
    }
  }

  static addToRoom(player)
  {
    let result = {status: null, gameId: null};
    rooms.forEach(function (room) {
      if (!room.isFull()) {
        result.status = room.addPlayer(player);
        return false;
      }
    });

    if (null === result.status) {
      let room = new Room(rooms.length);
      result.status = room.addPlayer(player);
      if (result.status) {
        rooms[room.id] = room;
      }
    }
    if (result.status && this.canStartRoom(player.roomId)) {
      console.log(1);
      let game = new Game(rooms[player.roomId]);
      game.id = activeGames.length;
      activeGames[game.id] = game;
      result.gameId = game.id;
      game.start();
    }
    return result;
  }

  static wait({gameId, id}, res)
  {
    if (activeGames.hasOwnProperty(gameId)) {
      activeGames[gameId].updatePlayer(id, res);
    }
  }

  updatePlayer(id, res)
  {
    let player = this.getPlayerById(id);
    if (player !== null) {
      player.res = res;
      return true;
    }
    return false;
  }

  static makeStep(gameId, playerId, pos)
  {
    let game = Game.getActiveGame(gameId);
    if (game && game.active) {
      let player = game.getPlayerById(playerId);
      if (player) {
        return game.step(player.type, pos);
      } else {
        console.error('player with id: ' + playerId + ' not found in game (id: ' + gameId + ')');
      }
    } else {
      console.error('game with id: ' + gameId + ' not found or game is inactive');
    }
    return 0;
  }

  /**
   *
   * @param gameId
   * @returns Game|boolean
   */
  static getActiveGame(gameId)
  {
    if (activeGames[gameId] instanceof Game && activeGames[gameId].active) {
      return activeGames[gameId];
    }
    return false;
  }

  sendProgress(id)
  {
    let player = this.getPlayerById(id);
    if (player !== null) {
      player.res.end(JSON.stringify({
        canAct:   player.type === this.canAct,
        progress: this.gameProgress,
        win:      false,
        oName:    (this.player1.id === player.id) ? this.player2.name : this.player1.name,
        type:     player.type,
      }));
      return true;
    }
    return false;
  }

  getPlayerById(id) {
    if (this.player1.id === id) {
      return this.player1;
    } else if (this.player2.id === id) {
      return this.player2;
    } else {
      console.error('player with id: ' + id + ' not found');
      return null;
    }
  }

  step(type, pos)
  {
    console.log(pos);
    if ((type === TYPE_0 || type === TYPE_X) && this.canAct) {
      this.gameProgress[pos.charAt(0)][pos.charAt(1)] = type;
      this.canAct = (type === TYPE_0) ? TYPE_X : TYPE_0;
      return this.endStep(null);
    } else {
      console.error('Wrong type: ' + type);
    }
    return 0;
  }

  win()
  {
    let p = this.gameProgress;
    return (
      (
        p[0][0] === p[0][1] && p[0][1] === p[0][2]
        || p[0][0] === p[1][0] && p[1][0] === p[2][0]
      ) && p[0][0]
      || (
        p[0][1] === p[1][1] && p[1][1] === p[2][1]
        || p[1][0] === p[1][1] && p[1][1] === p[1][2]
        || p[0][0] === p[1][1] && p[1][1] === p[2][2]
        || p[2][0] === p[1][1] && p[1][1] === p[0][2]
      ) && p[1][1]
      || (
        p[2][2] === p[2][1] && p[2][1] === p[2][0]
        || p[2][2] === p[1][2] && p[1][2] === p[0][2]
      ) && p[2][2]
    );
  }

  endStep(err)
  {
    if (!err) {
      let type = this.win();
      this.player1.res.end(JSON.stringify({
        canAct:   this.player1.type === this.canAct,
        progress: this.gameProgress,
        win:      type,
      }));
      this.player2.res.end(JSON.stringify({
        canAct:   this.player2.type === this.canAct,
        progress: this.gameProgress,
        win:      type,
      }));
      return JSON.stringify({
        canAct:   false,
        progress: this.gameProgress,
        win:      type,
      });
    } else {
      console.error(err);
      return 0;
    }
  }
}

module.exports = Game;
