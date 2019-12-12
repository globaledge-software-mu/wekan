const subManager = new SubsManager();

Template.boardListHeaderBar.events({
  'click .js-open-archived-board'() {
    Modal.open('archivedBoards');
  },
});

Template.boardListHeaderBar.helpers({
  templatesBoardId() {
    return Meteor.user().getTemplatesBoardId();
  },
  templatesBoardSlug() {
    return Meteor.user().getTemplatesBoardSlug();
  },
});

BlazeComponent.extendComponent({
  onCreated() {
    Meteor.subscribe('setting');
    Meteor.subscribe('mailServer');
    Meteor.subscribe('folders');
    Meteor.subscribe('templateBoards');
    Meteor.subscribe('cards');
  },

  onRendered() {
  	$('ul.board-list.clearfix').sortable({ cancel: '.js-toggle-sidebar' });

  	const folder = Session.get('folder');

  	if (folder == 'uncategorised') {
      $('a#uncategorisedBoardsFolder').trigger('click');
  	} else if (folder == 'templates') {
      $('a#templatesFolder').trigger('click');
  	} else {
  		if (!$('.myFolder[data-id="'+folder+'"]').hasClass('subFolderTAGli')) {
    		$('.myFolder[data-id="'+folder+'"] a.folderOpener').click();
  		} else {
  			$('.myFolder[data-id="'+folder+'"]').closest('ul.nav-second-level').siblings('a.folderOpener').children('i.folderHandle').first().click()
    		$('.myFolder[data-id="'+folder+'"] a.folderOpener').click();
  		}
  	}

  	// Add member to its template-container, case the template-container 
  	// member is null but the user has the template-container's id
  	var templatesBoardId = Meteor.user().profile.templatesBoardId;
  	var container = Boards.findOne({_id: templatesBoardId});
  	if (container && container.members && container.members.length < 1) {
	    Boards.update({
	    	_id: templatesBoardId,
	      type: 'template-container'
	    }, {
	    	$push: {
		      members: {
	          userId: Meteor.user()._id,
	          isAdmin: true,
	          isActive: true,
	          isNoComments: false,
	          isCommentOnly: false,
	        },
	    	}
	    });
  	}

  	/******************/

    const mailSettings = Settings.findOne();
    if (mailSettings && 
    		mailSettings.mailServer.host &&
    		mailSettings.mailServer.port &&
    		mailSettings.mailServer.username &&
    		mailSettings.mailServer.password &&
    		mailSettings.mailServer.enableTLS &&
    		mailSettings.mailServer.from 
    ) {
      Settings.update(mailSettings._id, {
        $set: {
          'mailServer.host': mailSettings.mailServer.host, 'mailServer.port': mailSettings.mailServer.port, 'mailServer.username': mailSettings.mailServer.username,
          'mailServer.password': mailSettings.mailServer.password, 'mailServer.enableTLS': mailSettings.mailServer.enableTLS, 'mailServer.from': mailSettings.mailServer.from,
        },
      });
    }

  	/******************/
  	/**********/

  	Cards.find({
  		$or: [
  			{ userId: Meteor.user()._id }, 
  			{ 'members.userId': Meteor.user()._id }
			]
  	}).forEach((card) => {
  		const startScores = CardScores.find({
  			cardId: card._id,
  			type: 'current',
  			userId: Meteor.user()._id,
  		}, {
  			sort: {date: -1}
  		}).fetch();
  		// For all current CardScores without initial score/date, pairing them with initial score date
  		// and also updating the  Card's startAt and currentScore if null
  		if (startScores.length > 0) {
  			// If startScores in CardScores && receivedAt in Cards is null
  			if (!card.receivedAt || card.receivedAt == '' || card.receivedAt == null) {
  				Cards.update(
  					{ _id: card._id },
  					{ $set: {
  						receivedAt: startScores[0].date
  					} }
  				);
  			}
  			// If startScores in CardScores && initialScore in Cards is null
  			if (!card.initialScore || card.initialScore == '' || card.initialScore == null) {
  				Cards.update(
  					{ _id: card._id },
  					{ $set: {
  						initialScore: startScores[0].score
  					} }
  				);
  			}
  			// If startScores && startAt in Cards is null
  			if (!card.startAt || card.startAt == '' || card.startAt == null) {
  				Cards.update(
  					{ _id: card._id },
  					{ $set: {
  						startAt: startScores[0].date
  					} }
  				);
  			}
  			// If startScores && currentScore in Cards is null
  			if (!card.currentScore || card.currentScore == '' || card.currentScore == null) {
  				Cards.update(
  					{ _id: card._id },
  					{ $set: {
  						currentScore: startScores[0].score
  					} }
  				);
  			}
  		}

  		// If Cards has receivedAt and no startAt
  		if (card.receivedAt && card.receivedAt != '' && card.receivedAt != null && 
  				!card.startAt || card.startAt == '' || card.startAt == null
  		) {
  			Cards.update(
  				{ _id: card._id },
  				{ $set: {
  					startAt: card.receivedAt
  				} }
  			);
  		}
  		// If Cards has initialScore and no currentScore
  		if (card.initialScore && card.initialScore != '' && card.initialScore != null && 
  				!card.currentScore || card.currentScore == '' || card.currentScore == null
  		) {
  			Cards.update(
  				{ _id: card._id },
  				{ $set: {
  					currentScore: card.initialScore
  				} }
  			);
  			// If no CardScores
  			if (startScores.length < 1) {
  				// If Cards do not have receivedAt
  				if (!card.receivedAt || card.receivedAt == '' || card.receivedAt == null) {
  					Cards.update(
  						{ _id: card._id }, 
  						{ $set: {
  							receivedAt: new Date(),
  						} }
  					);

  					// If Cards do not have startAt
  					if (!card.startAt || card.startAt == '' || card.startAt == null) {
  						Cards.update(
  							{ _id: card._id }, 
  							{ $set: {
  								startAt: new Date(),
  							} }
  						);
  					}
  				}
  			}
  		}
  	});

  	/**********/

  },

  boards() {
    return Boards.find({
      archived: false,
      'members.userId': Meteor.userId(),
      type: 'board',
    }, { sort: ['title'] });
  },

  folders() {
  	return Folders.find({
  	  userId: Meteor.userId()
	  }, {
	    sort: ['name']
	  });
  },

  everyBoardTemplates() {
    return Boards.find({
      type: 'template-board',
      archived: false, 
    });
  },

  assignedBoardTemplates() {
    return Boards.find({
      type: 'template-board',
      'members.userId': Meteor.userId(),
      archived: false, 
    });
  },

  isBoardTemplateAdmin() {
  	var currentBoard = Boards.findOne({_id: this.currentData()._id});
  	// returns true or false
  	return currentBoard && currentBoard.members[0].isAdmin == true && currentBoard.members[0].userId == Meteor.userId();
  },

  folderBoards() {
    var folderId = this.currentData()._id;

    if (folderId !== null) {
      var currentFolder = Folders.find({ _id: folderId }).fetch();
      var folderBoardsIds = new Array;

      if (currentFolder.length > 0) {
      	var folderContents = currentFolder[0].contents;
      	if (typeof(folderContents) != 'undefined' && folderContents !== null && _.keys(folderContents).length > 0) {
      	  for (var j=0; j < _.keys(folderContents).length; j++) {
      	    folderBoardsIds.push(folderContents[j].boardId);
          }
      	}
      }

      if (folderBoardsIds.length > 0) {
        return Boards.find(
          { _id: { $in: folderBoardsIds }, archived: false, 'members.userId': Meteor.userId(), }, 
          { sort: ['title'], }
        );
      } else {
        return null
      }
    } else {
        return null
    }
  },

  uncategorisedBoards() {
    if (!$('li.myFolder').children('a.folderOpener').hasClass('selected') && !$('a#templatesFolder').hasClass('selected')) {
      $('a#uncategorisedBoardsFolder').trigger('click');
    }
    var userFolders = Folders.find({ userId: Meteor.userId() }).fetch();
    var categorisedBoardIds = new Array;

    if (userFolders.length > 0) {
      for (var i=0; i < userFolders.length; i++) {
        var folderContents = userFolders[i].contents;
        if (typeof(folderContents) != 'undefined' && folderContents !== null && _.keys(folderContents).length > 0) {
          for (var j=0; j < _.keys(folderContents).length; j++) {
              categorisedBoardIds.push(folderContents[j].boardId);
          }
        }
      }
    }

    var uncategorisedBoardsDetails = Boards.find({ 
        _id: { $nin: categorisedBoardIds }, 
        archived: false, 
        'members.userId': Meteor.userId(), 
        type: { 
        	$nin: [ 'template-board', 'template-container' ]
        },
      }, 
      {fields: {'_id': 1}}
    ).fetch();
    var uncategorisedBoardIds = new Array();

    for (var i=0; i < uncategorisedBoardsDetails.length; i++) {
      uncategorisedBoardIds.push(uncategorisedBoardsDetails[i]._id);
    }

    return Boards.find(
      { _id: { $in: uncategorisedBoardIds }, archived: false, 'members.userId': Meteor.userId(), }, 
      { sort: ['title'], }
    );
  },

  isStarred() {
    const user = Meteor.user();
    return user && user.hasStarred(this.currentData()._id);
  },

  hasOvertimeCards() {
    subManager.subscribe('board', this.currentData()._id, false);
    return this.currentData().hasOvertimeCards();
  },

  hasSpentTimeCards() {
    subManager.subscribe('board', this.currentData()._id, false);
    return this.currentData().hasSpentTimeCards();
  },

  isInvited() {
    const user = Meteor.user();
    return user && user.isInvitedTo(this.currentData()._id);
  },

  events() {
    return [{
      'click .js-add-board, click .js-add-board-template'(evt) {
      	// First, archive any card of type "cardType-linkedBoard" whose 
      	// Board has been archived but the card by any chance was not archived 
      	// Then we open the targetted popup
      	Boards.find({ 
      		type: 'template-board',
      		archived: true,
      		'members.userId': Meteor.user()._id
    		}).forEach((archivedBoard) => {
      		var cardLinkedBoard = Cards.findOne({linkedId: archivedBoard._id});
      		if (cardLinkedBoard && !cardLinkedBoard.archived) {
      			Cards.update(
    					{ _id: cardLinkedBoard._id }, 
    					{ $set: {
    						archived: true,
    					} }
    				);
      		}
      	});

      	Popup.open('createBoard')(evt);
      	if ($(evt.target).closest('li').hasClass('js-add-board-template')) {
      		$('.js-new-board-title').addClass('createBoardTemplate');
      	}
      },
      'click .js-star-board'(evt) {
        const boardId = this.currentData()._id;
        Meteor.user().toggleBoardStar(boardId);
        evt.preventDefault();
      },
      'click .js-clone-board'(evt) {
        Meteor.call('cloneBoard',
          this.currentData()._id,
          Session.get('fromBoard'),
          {},
          (err, res) => {
            if (err) {
              this.setError(err.error);
            } else {
              Session.set('fromBoard', null);
              Utils.goBoardId(res);
            }
          }
        );
        evt.preventDefault();
      },
      'click .js-archive-board'(evt) {
        const boardId = this.currentData()._id;
        Meteor.call('archiveBoard', boardId);
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
      'click .sidebar-folder-tongue': function(e) {
        var selector = $('.sidebar-folder-tongue').children();
        if (selector.hasClass('fa-angle-left')) {
          // close sidebar
          $('.board-widget-folders').hide();
          $('.sidebar-folder-tongue').css('left', '7px');
        } else if (selector.hasClass('fa-angle-right')) {
          // open sidebar
          $('.board-widget-folders').show();
          $('.sidebar-folder-tongue').css('left', '-8px');
        }
        selector.toggleClass('fa-angle-right fa-angle-left');
        $('.board-list.clearfix').toggleClass('col-md-8 col-md-11');
      },
    }];
  },
}).register('boardList');

Template.createNewFolder.events({
  'submit #createFolderForBoardsDroppedOnEachOther': function(e) {
    e.preventDefault();

    Modal.close('createNewFolder');

    var newDoc = Folders.insert({ 
      name: $(e.target).find('input[name=name]').val(), 
      level: 'first', 
      userId: Meteor.userId()
    }, function(error) {
      if (error) {
        var $errorMessage = $('<div class="errorStatus">' +
          '<a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a>' +
          '<p><b>Error! Folder could not be created!</b></p>' +
          '</div>'
        );

        $('#header-main-bar').before($errorMessage);
        $errorMessage.delay(10000).slideUp(500, function() {
          $(this).remove();
        });

        return false;
      }
    });
    
    var folderId = newDoc;
    var boardIds = new Array;
    boardIds.push(sessionStorage.getItem('draggedBoardId'));
    boardIds.push(sessionStorage.getItem('droppedOnBoardId'));
    sessionStorage.removeItem('draggedBoardId');
    sessionStorage.removeItem('droppedOnBoardId');

    for (var i = 0; i < boardIds.length; i++) {
      var keyName = 'contents.' + i + '.boardId';
      Folders.update(
  	    { _id: folderId },
        { $set: { [keyName] : boardIds[i] } }
  	  );
    }

    var $successMessage = $('<div class="successStatus">' + 
      '<a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a>' +
      '<p><b>Folder was succesfully created and the boards have been moved into it!</b></p>' + 
      '</div>'
    );

    $('#header-main-bar').before($successMessage);
    $successMessage.delay(10000).slideUp(500, function() {
      $(this).remove();
    });
  },

  'click #cancelCreateFolderForBoardsDraggedOnEachOther': function(e) {
    Modal.close('createNewFolder');
    $('#'+draggedBoardId).animate({
      top: "0px",
      left: "0px"
    });
  },
});
