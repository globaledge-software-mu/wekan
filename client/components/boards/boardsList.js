const subManager = new SubsManager();

BlazeComponent.extendComponent({
  onCreated() {
    Meteor.subscribe('setting');
  },

  onRendered() {
	$('ul.board-list.clearfix').sortable();
	$('li.board-color-belize').draggable({
	  revert: 'invalid',
	  start: function(event) {
        $(this).css({'opacity': '0.5', 'pointer-events': 'none'});
        $(this).append($('<p id="actionTitle" class="center"><span class="fa fa-arrow-left"> </span><b> Drop in a folder</b></p>').css('color', '#2980b9'));
	  },
	  drag: function() {
		//
	  },
	  stop: function() {
	    $(this).css({'opacity': '1', 'pointer-events': 'auto'});
        $('p#actionTitle').remove();
	  }
	});
  },

  boards() {
    return Boards.find({
      archived: false,
      'members.userId': Meteor.userId(),
    }, {
      sort: ['title'],
    });
  },

  uncategorisedBoards() {
    return Boards.find({
      $or: [{folderId: null},{folderId: 'null'}],
      archived: false,
      'members.userId': Meteor.userId(),
    }, {
      sort: ['title'],
    });
  },

  isStarred() {
    const user = Meteor.user();
    return user && user.hasStarred(this.currentData()._id);
  },

  hasOvertimeCards() {
    subManager.subscribe('board', this.currentData()._id);
    return this.currentData().hasOvertimeCards();
  },

  hasSpentTimeCards() {
    subManager.subscribe('board', this.currentData()._id);
    return this.currentData().hasSpentTimeCards();
  },

  isInvited() {
    const user = Meteor.user();
    return user && user.isInvitedTo(this.currentData()._id);
  },

  events() {
    return [{
      'click .js-add-board': Popup.open('createBoard'),
      'click .js-star-board'(evt) {
        const boardId = this.currentData()._id;
        Meteor.user().toggleBoardStar(boardId);
        evt.preventDefault();
      },
      'click .js-accept-invite'() {
        const boardId = this.currentData()._id;
        Meteor.user().removeInvite(boardId);
      },
      'click .js-decline-invite'() {
        const boardId = this.currentData()._id;
        Meteor.call('quitBoard', boardId, (err, ret) => {
          if (!err && ret) {
            Meteor.user().removeInvite(boardId);
            FlowRouter.go('home');
          }
        });
      },
    }];
  },
}).register('boardList');
