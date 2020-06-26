const subManager = new SubsManager();

Template.boardListHeaderBar.events({
  'click .js-open-archived-board'() {
    Modal.open('archivedBoards');
  },

  'click #js-enable-search-board'(e) {
  	$('#js-search-board').prop('disabled', false);
  	$('#js-search-board').focus();
  },

  'keypress #js-search-board'(e) {
  	const param = $('#js-search-board').val();
  	Session.set('searchingBoardTitle', param);
  	var keycode = (event.keyCode ? event.keyCode : event.which);
  	if(keycode == '13'){
    	const boards = Boards.findOne();
    	// call method to search for the board
    	boards.searchBoard();
  	}
  },

  'click #search-board-icon'(e) {
  	const param = $('#js-search-board').val();
  	Session.set('searchingBoardTitle', param);
  	const boards = Boards.findOne();
  	// call method to search for the board
  	boards.searchBoard();
  },

  'click a#reset-search-board-input'() {
  	$('#js-search-board').val('');
  },

  'focusout #js-search-board'() {
  	$('#js-search-board').prop('disabled', true);
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
    Meteor.subscribe('userFolders');
    Meteor.subscribe('templateBoards');
    Meteor.subscribe('userCards');
  },
  
  showBoards() {
  	const selector = $('.board-list > .sk-spinner.sk-spinner-wave');
  	if (selector.length > 0) {
  		selector.remove();
  		$('.addBoardContainer').show();
	  }
  },

  onRendered() {
  	$('ul.board-list.clearfix').sortable({ cancel: '.js-toggle-sidebar' });

  	const folder = Session.get('folder');

  	if (folder == 'uncategorised') {
  		this.showBoards();
      $('a#uncategorisedBoardsFolder').trigger('click');
  	} else if (folder == 'templates') {
  		this.showBoards();
      $('a#templatesFolder').trigger('click');
  	} else {
  		if (!$('.myFolder[data-id="'+folder+'"]').hasClass('subFolderTAGli')) {
    		this.showBoards();
    		$('.myFolder[data-id="'+folder+'"] a.folderOpener').click();
  		} else {
  			$('.myFolder[data-id="'+folder+'"]').closest('ul.nav-second-level').siblings('a.folderOpener').children('i.folderHandle').first().click();
    		this.showBoards();
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

    Meteor.subscribe('mailServerInfo', {
      onReady() {
        const mailSettings = Settings.findOne();
        if (mailSettings && mailSettings.mailServer.host && mailSettings.mailServer.port && mailSettings.mailServer.username && 
        		mailSettings.mailServer.password && mailSettings.mailServer.enableTLS && mailSettings.mailServer.from 
        ) {
          Settings.update(mailSettings._id, {
            $set: {
              'mailServer.host': mailSettings.mailServer.host, 'mailServer.port': mailSettings.mailServer.port, 'mailServer.username': mailSettings.mailServer.username,
              'mailServer.password': mailSettings.mailServer.password, 'mailServer.enableTLS': mailSettings.mailServer.enableTLS, 'mailServer.from': mailSettings.mailServer.from,
            },
          });
        }
        return this.stop();
      },
    });

  	/******************/

    // Find all boards and any of the board that do not have an admin (the user who had created the board), 
    // out of its own members make one of them an admin of the board, preferably the member with the highest role,
    // only if there is no other boardadmin for that specific board
    const adminBoardIds = new Array();
    Boards.find({
    	'members.isAdmin': true
    }).forEach((board) => {
    	adminBoardIds.push(board._id);
    });
    const nonAdminBoards = Boards.find({
    	_id: {$nin: adminBoardIds}
  	});
    nonAdminBoards.forEach((nonAdminBoard) => {
    	const memberIds = new Array();
			var hasOtherBoardAdmin = false;
    	nonAdminBoard.members.forEach((member) => {
    		memberIds.push(member.userId);
				if (member.isAdmin === true) {
					hasOtherBoardAdmin = true;
				}
    	});
    	if (memberIds.length > 0 && hasOtherBoardAdmin === false) {
    		const adminRoleMember = Users.findOne({
      		_id: {$in: memberIds},
      		isAdmin: true
      	});
      	if (!adminRoleMember) {
      		const managerRole = Roles.findOne({name: 'Manager'});
      		if (managerRole && managerRole._id) {
      			const managerRoleMember = Users.findOne({
          		_id: {$in: memberIds},
          		roleId: managerRole._id
          	});
          	if (!managerRoleMember) {
          		const coachRole = Roles.findOne({name: 'Coach'});
          		if (coachRole && coachRole._id) {
          			const coachRoleMember = Users.findOne({
              		_id: {$in: memberIds},
              		roleId: coachRole._id
              	});
              	if (!coachRoleMember) {
              		const randomMemberId = memberIds[0].userId;
              		Boards.update(
            				{ _id: nonAdminBoard._id }, 
                    { $pull: {
                        members: {
                          userId: randomMemberId,
                        },
                      },
                    }
          				);
              		Boards.update(
            				{ _id: nonAdminBoard._id }, 
                    { $push: {
                        members: {
                          userId: randomMemberId,
                          isAdmin: true,
                          isActive: true,
                          isCommentOnly: false,
                        },
                      },
                    }
          				);
              	} else {
              		Boards.update(
            				{ _id: nonAdminBoard._id }, 
                    { $pull: {
                        members: {
                          userId: coachRoleMember._id,
                        },
                      },
                    }
          				);
              		Boards.update(
            				{ _id: nonAdminBoard._id }, 
                    { $push: {
                        members: {
                          userId: coachRoleMember._id,
                          isAdmin: true,
                          isActive: true,
                          isCommentOnly: false,
                        },
                      },
                    }
          				);
              	}
          		}
          	} else {
          		Boards.update(
        				{ _id: nonAdminBoard._id }, 
                { $pull: {
                    members: {
                      userId: managerRoleMember._id,
                    },
                  },
                }
      				);
          		Boards.update(
        				{ _id: nonAdminBoard._id }, 
                { $push: {
                    members: {
                      userId: managerRoleMember._id,
                      isAdmin: true,
                      isActive: true,
                      isCommentOnly: false,
                    },
                  },
                }
      				);
          	}
      		}
      	} else {
      		Boards.update(
    				{ _id: nonAdminBoard._id }, 
            { $pull: {
                members: {
                  userId: adminRoleMember._id,
                },
              },
            }
  				);
      		Boards.update(
    				{ _id: nonAdminBoard._id }, 
            { $push: {
                members: {
                  userId: adminRoleMember._id,
                  isAdmin: true,
                  isActive: true,
                  isCommentOnly: false,
                },
              },
            }
  				);
      	}
    	}
    });
    //____________________________________

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

  searchedBoards() {
  	const typedTitle = Session.get('searchingBoardTitle');
  	if (typeof typedTitle === 'string') {
      return Boards.find({
      	title: {$regex: typedTitle, $options: 'i'},
        archived: false,
        'members.userId': Meteor.userId(),
      }, { 
      	sort: ['title'] 
      });
  	} else {
  		return null;
  	}
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
