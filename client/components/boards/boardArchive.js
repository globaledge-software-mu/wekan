BlazeComponent.extendComponent({
  onCreated() {
    this.subscribe('archivedBoards');
  },

  archivedBoards() {
    return Boards.find({ archived: true }, {
      sort: ['title'],
    });
  },

  events() {
    return [{
      'click .js-restore-board'() {
        // TODO : Make isSandstorm variable global
        const isSandstorm = Meteor.settings && Meteor.settings.public &&
          Meteor.settings.public.sandstorm;
        if (isSandstorm && Session.get('currentBoard')) {
          const currentBoard = Boards.findOne(Session.get('currentBoard'));
          currentBoard.archive();
        }
        const board = this.currentData();
        if (board.type && board.type == 'template-board') {
        	const card = Cards.findOne({
        		linkedId: board._id
        	});
        	Cards.update(
      			{ _id: card._id }, 
      			{ $set: { archived: false } }
      		);
        }
        board.restore();
        Utils.goBoardId(board._id);
        location.reload();
      },
      'click .js-delete-board': Popup.afterConfirm('boardDelete', function() {
        Popup.close();
        const isSandstorm = Meteor.settings && Meteor.settings.public &&
          Meteor.settings.public.sandstorm;
        if (isSandstorm && Session.get('currentBoard')) {
          const currentBoard = Boards.findOne(Session.get('currentBoard'));
          Boards.remove(currentBoard._id);
        }
        Boards.remove(this._id);
        FlowRouter.go('home');
      }),
    }];
  },
}).register('archivedBoards');
