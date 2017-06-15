class Room {
  constructor(id)
  {
    this.EMPTY    = 0;
    this.IN_QUEUE = 1;
    this.FULL     = 2;

    this._id = id;
    this.player1 = null;
    this.player2 = null;
  }

  get id()
  {
    return this._id;
  }

  addPlayer(player)
  {
    console.log('Room status: ' + this.getStatus());
    let success = false;
    if (null === this.player1) {
      this.player1 = player;
      player.roomId = this._id;
      success = true;
    } else if (null === this.player2) {
      this.player2 = player;
      player.roomId = this._id;
      success = true;
    }
//    console.log('Room status: ' + this.getStatus());
//    console.log('player1: ' + this.player1);
//    console.log('player2: ' + this.player2);
    return success ? success : (console.error('cannot set player in room!') || false);
  }

  isFull()
  {
    return this.getStatus() === this.FULL;
  }

  getStatus()
  {
    switch (true) {
      case this.player1 !== null && this.player2 !== null:
        return this.FULL;
      case this.player1 !== null || this.player2 !== null:
        return this.IN_QUEUE;
      case this.player1 === null && this.player2 === null:
        return this.EMPTY;
    }
  }
}

module.exports = Room;