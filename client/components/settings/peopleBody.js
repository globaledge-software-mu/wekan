import swal from 'sweetalert';

const usersPerPage = 25;

BlazeComponent.extendComponent({
  mixins() {
    return [Mixins.InfiniteScrolling];
  },
  onCreated() {
    this.error = new ReactiveVar('');
    this.loading = new ReactiveVar(false);
    this.people = new ReactiveVar(true);
    this.roles = new ReactiveVar(false);
    this.userGroups = new ReactiveVar(false);
    this.plans = new ReactiveVar(false);
    this.subscriptions = new ReactiveVar(false);
    this.findUsersOptions = new ReactiveVar({});
    this.findRolesOptions = new ReactiveVar({});
    this.invitations = new ReactiveVar(false);
    this.number = new ReactiveVar(0);
    this.findInvitations = new ReactiveVar({});

    this.page = new ReactiveVar(1);
    this.loadNextPageLocked = false;
    this.callFirstWith(null, 'resetNextPeak');
    this.autorun(() => {
      const limit = this.page.get() * usersPerPage;

      this.subscribe('people', limit, () => {
        this.loadNextPageLocked = false;
        const nextPeakBefore = this.callFirstWith(null, 'getNextPeak');
        this.calculateNextPeak();
        const nextPeakAfter = this.callFirstWith(null, 'getNextPeak');
        if (nextPeakBefore === nextPeakAfter) {
          this.callFirstWith(null, 'resetNextPeak');
        }
      });
      this.subscribe('roles');
      Meteor.subscribe('users');
      Meteor.subscribe('role_colors');
      Meteor.subscribe('user_groups');
      Meteor.subscribe('assigned_user_groups');
      Meteor.subscribe('plans');
      Meteor.subscribe('subscriptions');
    });
  },
  
  onRendered() {
  	
  },
  
  loadNextPage() {
    if (this.loadNextPageLocked === false) {
      this.page.set(this.page.get() + 1);
      this.loadNextPageLocked = true;
    }
  },
  calculateNextPeak() {
    const element = this.find('.main-body');
    if (element) {
      const altitude = element.scrollHeight;
      this.callFirstWith(this, 'setNextPeak', altitude);
    }
  },
  reachNextPeak() {
    this.loadNextPage();
  },
  setError(error) {
    this.error.set(error);
  },
  setLoading(w) {
    this.loading.set(w);
  },
  peopleList() {
  	const currentUser = Meteor.user();
  	const isAdmin = currentUser.isAdmin;
  	if (isAdmin) {
  		const condition =  {'emails.verified':true};
  	  const users = Users.find(condition, {
        fields: { _id: true },
      });
      this.number.set(users.count(false));
      return this.number.get();
    } else if (!isAdmin && currentUser.roleName === 'Manager') {
    	this.number.set(this.managerUserGroupsUsersAndInviteesList().count());
    	return this.number.get();
    } else if (!isAdmin && currentUser.roleName === 'Coach') {
    	this.number.set(this.coachUserGroupsUsersAndInviteesList().count());
    	return this.number.get();
    }
  },
  
  invitationCount() {
  	const users = Users.find({
  		              'emails.verified':false, 
  		               createdBy:Meteor.user()._id}, {
                     fields: { _id: true },
                  });
    this.number.set(users.count(false));
    return this.number.get();
  },
   
  
  userGroupsCount() {
  	const userGroupList = UserGroups.find();
  	this.number.set(userGroupList.count());
  	return this.number.get();
  },
  
  hasExpiredSubscriptions() {
  	const expiredSubscription = Subscriptions.findOne({
  		archived: { $ne: true },
  		expiresOn: { $lt: new Date() },
		});

  	if (expiredSubscription && expiredSubscription._id) {
  		return true;
  	} else {
  		return false;
  	}
  },
  expiredSubscriptionsCount() {
  	const expiredSubscriptions = Subscriptions.find({
  		archived: { $ne: true },
  		expiresOn: { $lt: new Date() },
		});
  	if (expiredSubscriptions && expiredSubscriptions.count() > 0) {
  		return '(' + expiredSubscriptions.count() + ')';
  	}
  },
  managerUserGroupsUsersAndInviteesList() {
    const role = Roles.findOne({name: 'Manager'});
    if (role && role._id) {
    	const userId = Meteor.user()._id;
    	var userUserGroupsIds = new Array();
  		AssignedUserGroups.find({userId}).forEach((assignedUserGroup) => {
  			if (!userUserGroupsIds.includes(assignedUserGroup.userGroupId)) {
    			userUserGroupsIds.push(assignedUserGroup.userGroupId);
  			}
    	});
    	var sameUserGroupsUserIds = new Array();

      // First push the users created by the logged in user, its invitees
      Users.find({
        createdBy: Meteor.user()._id,
      }).forEach((invitee) => {
        sameUserGroupsUserIds.push(invitee._id)
      });

      // Then push the users of the same user groups as of the logged in user
    	AssignedUserGroups.find({
    		userGroupId: { $in: userUserGroupsIds }
    	}).forEach((assignedUserGroup) => {
        // Filter out the userIds already pushed earlier
  			if (!sameUserGroupsUserIds.includes(assignedUserGroup.userId)) {
      		sameUserGroupsUserIds.push(assignedUserGroup.userId);
  			}
    	});

      // Query the users using the ids pushed in sameUserGroupsUserIds
      // and the users can't be admins nor have the role manager
      let users;
      let condition;
      condition = { $and:[this.findUsersOptions.get(),{_id: { $in: sameUserGroupsUserIds }, 'emails.verified':true } ], 
      		          $nor: [{ isAdmin: true },{ roleId: role._id }]
                  };
      users = Users.find(condition);
      
      if (this.invitations.get()) {
      	condition = { $and:[ this.findUsersOptions.get(),{_id: { $in: sameUserGroupsUserIds }, 'emails.verified': false } ], 
	                   $nor: [{ isAdmin: true },{ roleId: role._id }] };
          users = Users.find(condition , {sort: {createdAt:-1 }});
      }
      this.number.set(users.count());
      return users;
    } else {
      this.number.set(0);
      return null;
    }
  },
  coachUserGroupsUsersAndInviteesList() {
    const managerRole = Roles.findOne({name: 'Manager'});
    const coachRole = Roles.findOne({name: 'Coach'});
    if (managerRole && managerRole._id && coachRole && coachRole._id) {
    	const userId = Meteor.user()._id;
    	var userUserGroupsIds = new Array();
  		AssignedUserGroups.find({userId}).forEach((assignedUserGroup) => {
  			if (!userUserGroupsIds.includes(assignedUserGroup.userGroupId)) {
    			userUserGroupsIds.push(assignedUserGroup.userGroupId);
  			}
    	});
    	var sameUserGroupsUserIds = new Array();

      // First push the users created by the logged in user, its invitees
      Users.find({
        createdBy: Meteor.user()._id,
      }).forEach((invitee) => {
        sameUserGroupsUserIds.push(invitee._id)
      });

      // Then push the users of the same user groups as of the logged in user
    	AssignedUserGroups.find({
    		userGroupId: { $in: userUserGroupsIds }
    	}).forEach((assignedUserGroup) => {
    	  // Filter out the userIds already pushed earlier
  			if (!sameUserGroupsUserIds.includes(assignedUserGroup.userId)) {
      		sameUserGroupsUserIds.push(assignedUserGroup.userId);
  			}
    	});

      // Query the users using the ids pushed in sameUserGroupsUserIds
      // and the users can't be admins nor have the role manager or coach
      let users;
      users = Users.find({
      	_id: { $in: sameUserGroupsUserIds },
      	'emails.verified': true,
      	
      	$and:[this.findUsersOptions.get()],
        $nor: [
          { isAdmin: true },
          { roleId: managerRole._id },
          { roleId: coachRole._id }
        ]
      });
      
      if (this.invitations.get()) {
    	  users = Users.find({
               _id: { $in: sameUserGroupsUserIds },
               'emails.verified': false,
               $and:[this.findUsersOptions.get()],
              $nor: [
                { isAdmin: true },
                { roleId: managerRole._id },
                { roleId: coachRole._id }
              ]
            });
      }
      this.number.set(users.count());
      return users;
    } else {
      this.number.set(0);
      return null;
    }
  },
  roleList() {
    const roles = Roles.find(this.findRolesOptions.get(), {
      sort: ['name'],
    });
    var count = roles.count();
    this.number.set(roles.count());
    return roles;
  },
  switchMenu(event) {
    const target = $(event.target);
    if (!target.hasClass('active')) {
      $('.side-menu li.active').removeClass('active');
      target.parent().addClass('active');
      const targetID = target.data('id');
      this.people.set('people-setting' === targetID);
      this.roles.set('roles-setting' === targetID);
      this.userGroups.set('user-groups-setting' === targetID);
      this.plans.set('plans-setting' === targetID);
      this.subscriptions.set('subscriptions-setting' === targetID);
      this.invitations.set('invitation-setting' === targetID);
    }
  },
  
  events() {
    return [{
    	'click #searchButton'() {
       this.filterPeople();
      },
      'keyup #searchInput' (event) {
        this.filterPeople();
      },
      'keydown #searchInput'(event) {
        if (event.keyCode === 13 && !event.shiftKey) {
          this.filterPeople();
        }
      },
      'click #searchInvitationButton'() {
        this.filterInvitations();
      },
      'keydown #searchInvitationButton'(event) {
        if (event.keyCode === 13 && !event.shiftKey) {
          this.filterInvitations();
        }
      },
      'keyup #searchInvitationButton'(event) {
      	this.filterInvitations();
      },
      'click a.js-setting-menu'(e) {
      	Popup.close();
      	this.switchMenu(e);
      },
      'click #create-user': Popup.open('createNewUser'),
      'click .js-btn-dropdown': function() {
         $('.roles').toggle('show');
      },
      'click .edit-user':Popup.open('editUser'),
      'click a.edit-invitee': Popup.open('editInvitee'),
      'click a.more-settings': Popup.open('settingsUser'),
    }];
  },
}).register('people');

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },

  onRendered() {
    this.setLoading(false);
  },

	setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },

  events() {
    return [{
    	submit(evt) {
        evt.preventDefault();
        const fullname = this.find('.js-profile-fullname').value.trim();
        const username = this.find('.js-profile-username').value.trim();
        var quotaGroupId = '';
        if (this.find('.choose-specific-quota-to-use option:selected')) {
          quotaGroupId = this.find('.choose-specific-quota-to-use option:selected').value.trim();
        }
        var isAdmin = false;
        if (this.find('.js-profile-isadmin')) {
          isAdmin = this.find('.js-profile-isadmin').value.trim();
        }
        const roleId = this.find('.js-profile-role').value;
      	const roleName = null;
        const role = Roles.findOne({_id: roleId});
        if (role && role.name) {
        	roleName = role.name;
        }
        const email = this.find('.js-profile-email').value.trim().toLowerCase();
        const posAt = email.indexOf('@');
        let duplicateUserEmail = null;
        let duplicateUserName = null;
        if (posAt >= 0) {
          if (username.length < 1) {
            username = email.substring(0, posAt);
            this.$('.js-profile-username').text(username);
          }
          duplicateUserEmail = Users.findOne({emails: {$elemMatch: {address: email}}});
          duplicateUserName = Users.findOne({username});
        }

        var leftBlank = ['undefined', null, ''];
        var fullnameLeftBlank = leftBlank.indexOf(fullname) > -1;
        var usernameLeftBlank = leftBlank.indexOf(username) > -1;
        var roleNotSelected = leftBlank.indexOf(roleId) > -1;
        var validEmailNotEntered = posAt < 1;
        $('.user-not-created').hide();
        if (fullnameLeftBlank) {
        	this.$('.fullname-blank').show();
        }
        if (usernameLeftBlank) {
        	this.$('.username-blank').show();
        }
        if (roleNotSelected) {
        	this.$('.role-not-selected').show();
        }
        if (validEmailNotEntered) {
        	this.$('.valid-email-not-entered').show();
        }
        if (fullnameLeftBlank || usernameLeftBlank || roleNotSelected || validEmailNotEntered) {
          return false;
        }

        const usernameMessageElement = this.$('.username-taken');
        const emailMessageElement = this.$('.email-taken');

        if (duplicateUserEmail && duplicateUserName) {
          usernameMessageElement.show();
          emailMessageElement.show();
        } else if (duplicateUserName) {
          usernameMessageElement.show();
        } else if (duplicateUserEmail) {
          emailMessageElement.show();
        } else {
          this.setLoading(true);
        	const params = {};
        	params['username'] = username;
        	params['email'] = email;
        	params['isAdmin'] = isAdmin;
        	params['fullname'] = fullname;
        	params['roleId'] = roleId;
        	params['roleName'] = roleName;
        	params['quotaGroupId'] = quotaGroupId;
          // Create user doc
          Meteor.call('createNewUser', params, (err, res) => {
          	this.setLoading(false);
            if (err) {
            	var message = '';
            	if (err.error) {
              	message = TAPi18n.__(err.error);
            	} else {
            		message = err;
            	}
              var $errorMessage = $('<div class="errorStatus inviteNotSent"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
              $('#header-main-bar').before($errorMessage);
              $errorMessage.delay(10000).slideUp(500, function() {
                $(this).remove();
              });
            } else if (res) {
            	var message1 = TAPi18n.__('user-created');
            	var message2 = TAPi18n.__('invite-sent');
              var $successMessage = $('<div class="successStatus inviteSent"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+
            		message1 + ' & ' + message2 +
            		'</b></p></div>'
          		);
              $('#header-main-bar').before($successMessage);
              $successMessage.delay(10000).slideUp(500, function() {
                $(this).remove();
              });
              Popup.close();
            }
          });
        };
      },

      'click #cancelButton'() {
        Popup.close();
      },
    }];
  },
}).register('createNewUserPopup');

BlazeComponent.extendComponent({
  onCreated() {
  },
  
  onRendered() {
    
  },
  
  setLoading(w) {
    
  },
  
  isLoading() {
    
  },
  
  events() {
    return [{
    	'click a.edit-invitee': function(evt) {
    		const userId = $(evt.target).data('id');
    		Session.set('selectedUser', userId);
    	 }, 
      'click a.resend-invite': function (evt) {
        const user = Users.findOne({_id:$(evt.target).data('id')});
        Meteor.call('resendInviteToUser', user , (err, ret) => {
          if (err) {
          	var $message = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+err.error+'</b></p></div>');
          	$('#header-main-bar').before($message);
            $message.delay(10000).slideUp(500, function() {
              $(this).remove();
            });
          } else if (ret.email) {
          	var message = TAPi18n.__('email-sent');
          	var $successMessage = $('<div class="successStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
            $('#header-main-bar').before($successMessage);
            $successMessage.delay(10000).slideUp(500, function() {
              $(this).remove();
            });
          }
        });
      },
     'click a.view-email': function(e)  {
    	  const userId = $(e.target).data('id');
    	  Modal.open('viewEmail');
    	  Session.set('manageUserId', userId);
     }
     
    }]
  }
}).register('invitationsGeneral');


/*Template.peopleRow.helpers({
  userData() {
    const userCollection = this.esSearch ? ESSearchResults : Users;
    return userCollection.findOne(this.userId);
  },
  roleName() {
    const userCollection = this.esSearch ? ESSearchResults : Users;
    let user = userCollection.findOne(this.userId);
    if (!user.roleId) {
      return '-';
    }
    let role = Roles.findOne(user.roleId);
    return role.name;
  },
  assignedUserGroups() {
    const userCollection = this.esSearch ? ESSearchResults : Users;
    const user = userCollection.findOne(this.userId);
    if (user && user._id) {
      var userGroupsIds = new Array();
      AssignedUserGroups.find({
        userId: user._id
      }).forEach((assignedUserGroup) => {
        userGroupsIds.push(assignedUserGroup.userGroupId);
      });
      return UserGroups.find({ _id: { $in: userGroupsIds } });
    }
  }
});*/

/*Template.invitationRow.helpers({
  userData() {
    const userCollection = this.esSearch ? ESSearchResults : Users;
    return userCollection.findOne(this.userId);
  },
  
  assignedUserGroups() {
    const userCollection = this.esSearch ? ESSearchResults : Users;
    const user = userCollection.findOne(this.userId);
    if (user && user._id) {
      var userGroupsIds = new Array();
      AssignedUserGroups.find({
	        userId: user._id
	  }).forEach((assignedUserGroup) => {
		  userGroupsIds.push(assignedUserGroup.userGroupId);
	  });
      return UserGroups.find({ _id: { $in: userGroupsIds } });
	 }
  },
  
  roleName() {
    const userCollection = this.esSearch ? ESSearchResults : Users;
    let user = userCollection.findOne(this.userId);
    if (!user.roleId) {
	      return '-';
	  }
    let role = Roles.findOne(user.roleId);
    return role.name;
	}
  
  
});*/

Template.roleRow.helpers({
  roleData() {
    return Roles.findOne(this.roleId);
  },
});

BlazeComponent.extendComponent({
  onCreated() {
  },
  user() {
    return Users.findOne(this.userId);
  },
  events() {
    return [{
      'click a.edit-user': Popup.open('editUser'),
      'click a.more-settings': Popup.open('settingsUser')
    }];
  },
}).register('peopleRow');

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },

  onRendered() {
    this.setLoading(false);
  },

	setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },

  events() {
    return [{
      submit(evt) {
        evt.preventDefault();
      	$('#editUserPopup').find('.errorStatus').remove();
        const user_id = this.find('.userId').value.trim();
        const user = Users.findOne(user_id);
        const fullname = this.find('.js-profile-fullname').value.trim();
        const username = this.find('.js-profile-username').value.trim();
        const password = this.find('.js-profile-password').value;
        var isAdmin = false;
        if (this.find('.js-profile-isadmin') && this.find('.js-profile-isadmin').value) {
          isAdmin = this.find('.js-profile-isadmin').value.trim();
        }
        const roleId = this.find('.js-profile-role').value;
      	const roleName = null;
        const role = Roles.findOne({_id: roleId});
        if (role && role.name) {
        	roleName = role.name;
        }
        const isActive = this.find('.js-profile-isactive').value.trim();
        const email = this.find('.js-profile-email').value.trim();

        const isChangePassword = password.length > 0;
        const isChangeUserName = username !== user.username;
        const isChangeEmail = email.toLowerCase() !== user.emails[0].address.toLowerCase();

        this.setLoading(true);

        Users.update(user_id, {
          $set: {
            'profile.fullname': fullname,
            'isAdmin': isAdmin === 'true',
            'roleId': roleId,
            'roleName': roleName,
            'loginDisabled': isActive === 'true',
          },
        }, (err, res) => {
        	this.setLoading(false);
          if (err) {
          	var message = '';
          	if (err.error) {
            	message = TAPi18n.__(err.error);
          	} else {
          		message = err;
          	}
            var $errorMessage = $('<div class="errorStatus" style="padding: 0px; margin: 0px 20px 0px 20px"><p><b>'+message+'</b></p></div>');
            $('#editUserPopup').prepend($errorMessage);
          } else if (res) {
            this.$('.username-taken').hide();
            this.$('.email-taken').hide();

            if (isChangePassword) {
              Meteor.call('setPassword', password, user_id);
            }

            function displayEditUserSuccessMsg() {
              var message = TAPi18n.__('edit-user-successful');
              var $successMessage = $('<div class="successStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
              $('#header-main-bar').before($successMessage);
              $successMessage.delay(10000).slideUp(500, function() {
                $(this).remove();
              });
              Popup.close();
            };
            
            if (isChangeUserName && isChangeEmail) {
              Meteor.call('setUsernameAndEmail', username, email.toLowerCase(), user_id, function (error) {
                if (error) {
                  const errorElement = error.error;
                  if (errorElement === 'username-already-taken') {
                  	this.$('.username-taken').show();
                  }
                  if (errorElement === 'email-already-taken') {
                  	this.$('.email-taken').show();
                  }
                } else {
                  displayEditUserSuccessMsg();
                }
              });
            } else if (isChangeUserName && !isChangeEmail) {
              Meteor.call('setUsername', username, user_id, function (error) {
                if (error) {
                  const errorElement = error.error;
                  if (errorElement === 'username-already-taken') {
                  	this.$('.username-taken').show();
                  }
                } else {
                  displayEditUserSuccessMsg();
                }
              });
            } else if (!isChangeUserName && isChangeEmail) {
              Meteor.call('setEmail', email.toLowerCase(), user_id, function (error) {
                if (error) {
                  const errorElement = error.error;
                  if (errorElement === 'email-already-taken') {
                  	this.$('.email-taken').show();
                  }
                } else {
                  sendEmail();
                  displayEditUserSuccessMsg();
                }
              });
            } else {
              displayEditUserSuccessMsg();
            }
          }
        });
      },

      'click #deleteButton'() {
      	const toBeDeletedUserId = Template.instance().data.userId;
        Popup.close();
        swal({
          title: 'Confirm Delete User!',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: [true, 'Remove'],
          dangerMode: true,
        })
        .then((okDelete) => {
          if (okDelete) {
        		// If the user to be deleted was an admin of a board, we need to
          	// make one of the would-be remaining members of that board an admin of those specific boards,
          	// only if there is no other boardadmin for that specific board,
          	// preferably a member with the highest user role of the board
            Boards.find({
              members: {
                $elemMatch: {
                  userId: toBeDeletedUserId,
                  isAdmin: true
                }
              }
          	}).forEach((board) => {
          		Boards.update(
        				{ _id: board._id },
                { $pull: {
                    members: {
                      userId: toBeDeletedUserId,
                    },
                  },
                }
      				);
          		const memberIds = new Array();
        			const hasOtherBoardAdmin = false;
        			board.members.forEach((member) => {
        				if (toBeDeletedUserId !== member.userId) {
          				memberIds.push(member.userId);
          				if (member.isAdmin === true) {
          					hasOtherBoardAdmin = true;
          				}
        				}
        			});
        			if (memberIds.length > 0 && hasOtherBoardAdmin === false) {
          			const adminRoleMember = Users.findOne({
              		_id: {$in: memberIds},
              		isAdmin: true
              	});
              	if (adminRoleMember) {
              		Boards.update(
            				{ _id: board._id },
                    { $pull: {
                        members: {
                          userId: adminRoleMember._id,
                        },
                      },
                    }
          				);
              		Boards.update(
            				{ _id: board._id },
                    { $push: {
                        members: {
                          isAdmin: true,
                          isActive: true,
                          isCommentOnly: false,
                          userId: adminRoleMember._id,
                        },
                      },
                    }
          				);
              	} else {
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
                    				{ _id: board._id },
                            { $pull: {
                                members: {
                                  userId: randomMemberId,
                                },
                              },
                            }
                  				);
                      		Boards.update(
                    				{ _id: board._id },
                            { $push: {
                                members: {
                                  isAdmin: true,
                                  isActive: true,
                                  isCommentOnly: false,
                                  userId: randomMemberId,
                                },
                              },
                            }
                  				);
                      	} else {
                      		Boards.update(
                    				{ _id: board._id },
                            { $pull: {
                                members: {
                                  userId: coachRoleMember._id,
                                },
                              },
                            }
                  				);
                      		Boards.update(
                    				{ _id: board._id },
                            { $push: {
                                members: {
                                  isAdmin: true,
                                  isActive: true,
                                  isCommentOnly: false,
                                  userId: coachRoleMember._id,
                                },
                              },
                            }
                  				);
                      	}
                  		}
                  	} else {
                  		Boards.update(
                				{ _id: board._id },
                        { $pull: {
                            members: {
                              userId: managerRoleMember._id,
                            },
                          },
                        }
              				);
                  		Boards.update(
                				{ _id: board._id },
                        { $push: {
                            members: {
                              isAdmin: true,
                              isActive: true,
                              isCommentOnly: false,
                              userId: managerRoleMember._id,
                            },
                          },
                        }
              				);
                  	}
              		}
              	}
        			}
          	});

          	// Remove deleting user as a member of any board he was a member of.
            Boards.find({
            	'members.userId': toBeDeletedUserId,
          	}).forEach((board) => {
          		Boards.update(
        				{ _id: board._id },
                { $pull: {
                    members: {
                      userId: toBeDeletedUserId,
                    },
                  },
                }
      				);
          	});

            // Remove User
            Users.remove(toBeDeletedUserId);
          } else {
            return false;
          }
        });
      },
    }];
  },
}).register('editUserPopup');

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },

  onRendered() {
    this.setLoading(false);
  },

	setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },
  
  events() {
    return[{
    	 submit(evt) {
         evt.preventDefault();
       	$('#editUserPopup').find('.errorStatus').remove();
         const user_id = this.find('.invitee').value.trim();
         const user = Users.findOne(user_id);
         const fullname = this.find('.js-profile-fullname').value.trim();
         const username = this.find('.js-profile-username').value.trim();
         
         var isAdmin = false;
         if (this.find('.js-profile-isadmin') && this.find('.js-profile-isadmin').value) {
           isAdmin = this.find('.js-profile-isadmin').value.trim();
         }
         const roleId = this.find('.js-profile-role').value;
       	 const roleName = null;
         const role = Roles.findOne({_id: roleId});
         if (role && role.name) {
         	roleName = role.name;
         }
         
         const email = this.find('.js-profile-email').value.trim();

         const isChangeUserName = username !== user.username;
         const isChangeEmail = email.toLowerCase() !== user.emails[0].address.toLowerCase();

         this.setLoading(true);

         Users.update(user_id, {
           $set: {
             'profile.fullname': fullname,
             'isAdmin': isAdmin === 'true',
             'roleId': roleId,
             'roleName': roleName
           },
         }, (err, res) => {
         	this.setLoading(false);
           if (err) {
           	var message = '';
           	if (err.error) {
             	message = TAPi18n.__(err.error);
           	} else {
           		message = err;
           	}
             var $errorMessage = $('<div class="errorStatus" style="padding: 0px; margin: 0px 20px 0px 20px"><p><b>'+message+'</b></p></div>');
             $('#editUserPopup').prepend($errorMessage);
           } else if (res) {
             this.$('.username-taken').hide();
             this.$('.email-taken').hide();

             function displayEditUserSuccessMsg() {
               var message = TAPi18n.__('edit-user-successful');
               var $successMessage = $('<div class="successStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
               $('#header-main-bar').before($successMessage);
               $successMessage.delay(10000).slideUp(500, function() {
                 $(this).remove();
               });
               Popup.close();
             };
             
             function sendEmail(emailAddress)
             {
            	 const boards = Boards.findOne({
         	      'members.userId': user_id
         	     });
            	 
            	 Meteor.call('resendInviteToUser', emailAddress, (err, ret) => {
          			 if (err) {
          				 console.log(err);
          				 var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+err.error+'</b></p></div>');
          				 $('#header-main-bar').before($erroMessage);
          				 $errorMessage.delay(10000).slideUp(500, function() {
                     $(this).remove();
                   });
                 } else if (ret.email) {
                	 console.log(ret);
                   var message = TAPi18n.__('email-sent');
                   var $successMessage = $('<div class="successStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
                   $('#header-main-bar').before($successMessage);
                   $successMessage.delay(10000).slideUp(500, function() {
                     $(this).remove();
                   });
                 }
                });
              };
             
             if (isChangeUserName && isChangeEmail) {
               Meteor.call('setUsernameAndEmail', username, email.toLowerCase(), user_id, function (error) {
                 if (error) {
                   const errorElement = error.error;
                   if (errorElement === 'username-already-taken') {
                   	this.$('.username-taken').show();
                   }
                   if (errorElement === 'email-already-taken') {
                   	this.$('.email-taken').show();
                   }
                 } else {
                	 sendEmail(email.toLowerCase);
                   displayEditUserSuccessMsg();
                 }
               });
             } else if (isChangeUserName && !isChangeEmail) {
               Meteor.call('setUsername', username, user_id, function (error) {
                 if (error) {
                   const errorElement = error.error;
                   if (errorElement === 'username-already-taken') {
                   	this.$('.username-taken').show();
                   }
                 } else {
                   displayEditUserSuccessMsg();
                 }
               });
             } else if (!isChangeUserName && isChangeEmail) {
               Meteor.call('setEmail', email.toLowerCase(), user_id, function (error) {
                 if (error) {
                   const errorElement = error.error;
                   if (errorElement === 'email-already-taken') {
                   	this.$('.email-taken').show();
                   }
                 } else {
                	 const newEmail = email.toLowerCase();
                   sendEmail(newEmail);
                   displayEditUserSuccessMsg();
                 }
               });
             } else {
               displayEditUserSuccessMsg();
             }
           }
         });
       },
       
       'click #deleteButton'() {
       	const toBeDeletedUserId = Template.instance().data.userId;
         Popup.close();
         swal({
           title: 'Confirm Delete User!',
           text: 'Are you sure?',
           icon: 'warning',
           buttons: [true, 'Remove'],
           dangerMode: true,
         })
         .then((okDelete) => {
           if (okDelete) {
         		// If the user to be deleted was an admin of a board, we need to
           	// make one of the would-be remaining members of that board an admin of those specific boards,
           	// only if there is no other boardadmin for that specific board,
           	// preferably a member with the highest user role of the board
             Boards.find({
               members: {
                 $elemMatch: {
                   userId: toBeDeletedUserId,
                   isAdmin: true
                 }
               }
           	}).forEach((board) => {
           		Boards.update(
         				{ _id: board._id },
                 { $pull: {
                     members: {
                       userId: toBeDeletedUserId,
                     },
                   },
                 }
       				);
           		const memberIds = new Array();
         			const hasOtherBoardAdmin = false;
         			board.members.forEach((member) => {
         				if (toBeDeletedUserId !== member.userId) {
           				memberIds.push(member.userId);
           				if (member.isAdmin === true) {
           					hasOtherBoardAdmin = true;
           				}
         				}
         			});
         			if (memberIds.length > 0 && hasOtherBoardAdmin === false) {
           			const adminRoleMember = Users.findOne({
               		_id: {$in: memberIds},
               		isAdmin: true
               	});
               	if (adminRoleMember) {
               		Boards.update(
             				{ _id: board._id },
                     { $pull: {
                         members: {
                           userId: adminRoleMember._id,
                         },
                       },
                     }
           				);
               		Boards.update(
             				{ _id: board._id },
                     { $push: {
                         members: {
                           isAdmin: true,
                           isActive: true,
                           isCommentOnly: false,
                           userId: adminRoleMember._id,
                         },
                       },
                     }
           				);
               	} else {
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
                     				{ _id: board._id },
                             { $pull: {
                                 members: {
                                   userId: randomMemberId,
                                 },
                               },
                             }
                   				);
                       		Boards.update(
                     				{ _id: board._id },
                             { $push: {
                                 members: {
                                   isAdmin: true,
                                   isActive: true,
                                   isCommentOnly: false,
                                   userId: randomMemberId,
                                 },
                               },
                             }
                   				);
                       	} else {
                       		Boards.update(
                     				{ _id: board._id },
                             { $pull: {
                                 members: {
                                   userId: coachRoleMember._id,
                                 },
                               },
                             }
                   				);
                       		Boards.update(
                     				{ _id: board._id },
                             { $push: {
                                 members: {
                                   isAdmin: true,
                                   isActive: true,
                                   isCommentOnly: false,
                                   userId: coachRoleMember._id,
                                 },
                               },
                             }
                   				);
                       	}
                   		}
                   	} else {
                   		Boards.update(
                 				{ _id: board._id },
                         { $pull: {
                             members: {
                               userId: managerRoleMember._id,
                             },
                           },
                         }
               				);
                   		Boards.update(
                 				{ _id: board._id },
                         { $push: {
                             members: {
                               isAdmin: true,
                               isActive: true,
                               isCommentOnly: false,
                               userId: managerRoleMember._id,
                             },
                           },
                         }
               				);
                   	}
               		}
               	}
         			}
           	});

           	// Remove deleting user as a member of any board he was a member of.
             Boards.find({
             	'members.userId': toBeDeletedUserId,
           	}).forEach((board) => {
           		Boards.update(
         				{ _id: board._id },
                 { $pull: {
                     members: {
                       userId: toBeDeletedUserId,
                     },
                   },
                 }
       				);
           	});

             // Remove User
             Users.remove(toBeDeletedUserId);
           } else {
             return false;
           }
         });
       },
       
    }]
  },
}).register('editInviteePopup');

Template.editInviteePopup.helpers({
	user() {
	  return Users.findOne(Session.get('selectedUser'));
	},

	isSelected(match) {
	  const userId = Session.get('selectedUser');
	  const selected = Users.findOne(userId).authenticationMethod;
	  return selected === match;
	},

	isLdap() {
	  const userId = Session.get('selectedUser');
	  const selected = Users.findOne(userId).authenticationMethod;
	  return selected === 'ldap';
	},
});

Template.editUserPopup.helpers({
	user() {
	  return Users.findOne(Session.get('selectedUser'));
	},

	isSelected(match) {
	  const userId = Session.get('selectedUser');
	  const selected = Users.findOne(userId).authenticationMethod;
	  return selected === match;
	},

	isLdap() {
	  const userId = Session.get('selectedUser');
	  const selected = Users.findOne(userId).authenticationMethod;
	  return selected === 'ldap';
	},
});

Template.roleOptions.helpers({
  currentRole(match) {
    const userId = Session.get('selectedUser');
    if (userId) {
      const selected = Users.findOne(userId).roleId;
      return selected === match;
    }
    return false;
  },
  roles() {
    return Roles.find({});
  },
  coachOrCoacheeRoles() {
    return Roles.find({
      $or: [{ name: 'Coach' }, { name: 'Coachee' }]
    });
  },
  coacheeRole() {
    return Roles.findOne({ name: 'Coachee' });
  },
});

BlazeComponent.extendComponent({
  onCreated() {
  },
  roles() {
    return Roles.find({}, {
      sort: ['name']
    });
  },
  events() {
    return [{
      'click button.js-open-create-role': Popup.open('createRole'),
    }];
  },
}).register('rolesGeneral');

BlazeComponent.extendComponent({
  onCreated() {
  },
  events() {
    return [{
      'click a.edit-role': Popup.open('createRole'),
    }];
  },
}).register('roleRow');


Template.createRolePopup.events({
  submit(evt, tpl) {
    evt.preventDefault();
    let permissions = [];
    tpl.$('.js-permission.is-checked').each(function(id, elem) {
      let group = $(elem).parents('tr').data('group');
      let access = $(elem).data('access');
      permissions.push({group:group, access:access});
    });
    const name = tpl.find('.js-role-name').value.trim();
    const colour = tpl.$('.fa-check').closest('.palette-color.js-palette-color').data('color');

    // insert or update
    if (!this.roleId) {
      const newRoleId = Roles.insert({
        'name': name,
        'permissions': permissions,
      });
      if (colour) {
      	RoleColors.insert({
      		roleId: newRoleId,
      		color: colour,
      		roleName: name
      	});
      }
    } else {
      Roles.update(this.roleId, {
        $set: {
          'name': name,
          'permissions': permissions,
        },
      });
      if (colour) {
      	const roleColor = RoleColors.findOne({ roleId: this.roleId });
      	if (roleColor && roleColor._id) {
      		RoleColors.update(
      			{ _id: roleColor._id },
      			{ $set:
      				{  color: colour, roleName: name }
      			}
    			);
      	} else {
        	RoleColors.insert({
        		roleId: this.roleId,
        		color: colour,
        		roleName: name
        	});
      	}
      }
    }

    Popup.close();
  },

  'click .palette-color.js-palette-color'(e) {
  	if (!$(e.target).hasClass('fa-check')) {
    	var colorsSelector = $('.palette-color.js-palette-color');
    	colorsSelector.children().remove();
    	colorsSelector.css({'padding-left':'8px', 'padding-right':'8px'});
    	$(e.currentTarget).append('<i class="fa fa-check"></i>');
    	$(e.currentTarget).css({'padding-left':'5px', 'padding-right':'5px'});
  	}
  },

  'click .js-permission'(evt) {
    let $target = $(evt.target);
    if(!$target.hasClass('js-permission')){
      $target = $target.parent();
    }
    $target.find('.materialCheckBox').toggleClass('is-checked');
    $target.toggleClass('is-checked');
  },

  'click #deleteButton'() {
    Roles.remove(this.roleId);
    Popup.close();
  },
});

Template.createRolePopup.helpers({
  isEnabled(role, group, access) {
    if (!role) {
      return false;
    }
    for (var i in role.permissions) {
      if (role.permissions[i].group == group && role.permissions[i].access == access)
        return true;
    }
    return false;
  },
  groups() {
    return Roles.groups;
  },
  role() {
    return Roles.findOne(this.roleId);
  },
  managerCoachOrCoacheeDoc(id) {
  	var role = Roles.findOne({
  		_id: id,
  		name: {
  			$in: ['Manager', 'Coach', 'Coachee']
  		}
  	});

  	if (role) {
  		return true;
  	}
  	return false;
  },
  colors() {
  	return [
  		'green', 'yellow', 'orange', 'red',
  		'purple', 'blue', 'sky', 'lime',
  		'pink', 'peachpuff', 'crimson', 'plum',
  		'darkgreen', 'slateblue', 'magenta', 'gold',
  		'navy', 'saddlebrown', 'paleturquoise', 'indigo'
  	];
  },
  isSelected(id, colour) {
  	const roleColor = RoleColors.findOne({
  		roleId: { $exists: true, $eq: id },
  		color: colour
  	});
  	if (roleColor) {
  		return true;
  	}
  	return false;
  },
});

BlazeComponent.extendComponent({
  events() {
	  return [{
	    'click button#create-user-group': Popup.open('createUserGroup'),
	    'click a.manage-user-group': function(e) {
	    	const groupId = $(e.target).data('user-group-id');
	    	Modal.open('editUserGroup');
	    	Session.set('manageUserGroupId', groupId);
    },
	  }];
	}
}).register('userGroupsGeneral');

Template.userGroupsGeneral.helpers({
  userGroupsList() {
  	return UserGroups.find();
  },
  tableSettings : function () {
    return {
        currentPage: Template.instance().currentPage,
        fields: [
          { key: 'title', label: TAPi18n.__('title') },
          { key: 'usersQuota', label: TAPi18n.__('users-quota')},
          { key: 'usedUsersQuota',  label: TAPi18n.__('used-users-quota')},
          { key: 'boardsQuota', label: TAPi18n.__('boards-quota') },
          { key: 'usedBoardsQuota', label: TAPi18n.__('used-boards-quota')},
          { key: '_id', label: TAPi18n.__('group-admin'), fn: function(_id) {
          	var data = UserGroups.findOne({_id:_id});
        		if (data && data._id) {
        			var groupAdminsIds = new Array();
        			AssignedUserGroups.find({userGroupId: data._id}).forEach((assignedUserGroup) => {
        				if (assignedUserGroup.groupAdmin === 'Yes') {
        					groupAdminsIds.push(assignedUserGroup.userId);
        				}
        			});
        			var usernames = '<ul>';
        			Users.find({_id: {$in: groupAdminsIds}}).forEach((user) => {
        				usernames += '<li>'+user.username+'</li>';
        			});
        			return new Spacebars.SafeString(usernames);
        	    
        		}
            return new Spacebars.SafeString('');
          } },
          { key: 'createdAt', 'label': TAPi18n.__('createdAt'), fn: function(createdAt) { return moment(createdAt).format('LLL'); }},
          { key: '_id', 'label': 'Action', fn: function(_id) { return new Spacebars.SafeString('<a class="manage-user-group" data-user-group-id="'+_id+'" href="#">Manage</a>'); }},
        ]
    };
  },
  
});

/*BlazeComponent.extendComponent({
  events() {
	  return [{
      'click a.manage-user-group'(e) {
      	const groupId = $(e.target).data('user-group-id');
        Modal.open('editUserGroup');
        Session.set('manageUserGroupId', groupId);
      },
	  }];
	}
}).register('userGroupRow');

Template.userGroupRow.helpers({
	userGroupData() {
		var data = UserGroups.findOne(this.userGroupId);
		if (data && data._id) {
			var groupAdminsIds = new Array();
			AssignedUserGroups.find({userGroupId: data._id}).forEach((assignedUserGroup) => {
				if (assignedUserGroup.groupAdmin === 'Yes') {
					groupAdminsIds.push(assignedUserGroup.userId);
				}
			});
			var usernames = new Array();
			Users.find({_id: {$in: groupAdminsIds}}).forEach((user) => {
				usernames.push(user.username);
			});
			data.groupAdmins = usernames;
	    return data;
		}
    return null;
  },
});*/

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },

  onRendered() {
    this.setLoading(false);
  },

	setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },

  events() {
    return [{
    	submit(evt) {
        evt.preventDefault();
        const title = this.find('.js-user-group-title').value.trim();
        const boardsQuota = this.find('.js-user-group-boards-quota').value.trim();
        const usersQuota = this.find('.js-user-group-users-quota').value.trim();

        var leftBlank = ['undefined', null, ''];
        var titleLeftBlank = leftBlank.indexOf(title) > -1;
        var boardsQuotaLeftBlank = leftBlank.indexOf(boardsQuota) > -1;
        var usersQuotaLeftBlank = leftBlank.indexOf(usersQuota) > -1;
        $('.user-group-not-created').hide();
        if (titleLeftBlank) {
        	this.$('.title-blank').show();
        }
        const duplicateTitle = UserGroups.findOne({title});
        if (duplicateTitle) {
        	this.$('.title-duplicate').show();
        }
        if (boardsQuotaLeftBlank) {
        	this.$('.boards-quota-blank').show();
        }
        if (usersQuotaLeftBlank) {
        	this.$('.users-quota-blank').show();
        }
        if (titleLeftBlank || boardsQuotaLeftBlank || usersQuotaLeftBlank || duplicateTitle) {
          return false;
        }
        this.setLoading(true);

        UserGroups.insert({
        	title, boardsQuota, usersQuota
      	}, (err, res) => {
	        	this.setLoading(false);
	          if (err) {
	          	var message = '';
	          	if (err.error) {
	            	message = TAPi18n.__(err.error);
	          	} else {
	          		message = err;
	          	}
	            var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
	            $('#header-main-bar').before($errorMessage);
	            $errorMessage.delay(10000).slideUp(500, function() {
	              $(this).remove();
	            });
	          } else if (res) {
	          	var message = TAPi18n.__('user-group-created');
	            var $successMessage = $('<div class="successStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
	            $('#header-main-bar').before($successMessage);
	            $successMessage.delay(10000).slideUp(500, function() {
	              $(this).remove();
	            });
	            Popup.close();
	          }
	        }
        );
      },

      'click #cancelUserGroupCreation'() {
        Popup.close();
      },
    }];
  },
}).register('createUserGroupPopup');

BlazeComponent.extendComponent({
  onCreated() {
    Meteor.subscribe('logos');

    this.error = new ReactiveVar('');
    this.loading = new ReactiveVar(false);
  },

  onRendered() {
    this.setLoading(false);
  },

	setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },

  logoUrlOptions() {
    return {
      auth: false,
      brokenIsFine: true,
    };
  },

  setLogo(logoUrl, userGroupId) {
    const userGroup = UserGroups.findOne({_id: userGroupId});
    if (userGroup && userGroup._id) {
      if (userGroup.logoUrl && userGroup.logoUrl.length > 0) {
        const oldLogoUrl = userGroup.logoUrl;
        const splittedUrl = oldLogoUrl.split('/');
        const oldLogoName = splittedUrl[5];
        if (oldLogoName.length > 0) {
          const oldLogo = Logos.findOne({'original.name': oldLogoName});
          if (oldLogo && oldLogo._id) {
            Logos.remove({_id: oldLogo._id});
          }
        }
      }
      userGroup.setLogoUrl(logoUrl);
    }
  },

  setError(error) {
    this.error.set(error);
  },

  events() {
    return [{
    	'change #js-select-user'(evt) {
        // clearing any immediate previous response
        if ($('.errorResponse').length > 0 || $('.successResponse').length > 0) {
        	$('a.manageUserGroupResponse').empty();
        }

    		const userGroupId = $('.userGroupTitle').data('user-group-id');
    		const selectedUserId = $("#js-select-user option:selected").val();
    		var groupOrder = 1;
    		var useCustomDefaultLogo = 'No';
    		var useCustomBoardColor = 'No';
    		const assignedUserGroups = AssignedUserGroups.find({ userId: selectedUserId, userGroupId }, {$sort: {groupOrder: -1}});
    		if (assignedUserGroups && assignedUserGroups.count() > 0)  {
    			groupOrder = assignedUserGroups[0].groupOrder + 1;
    		}
    		
    		const userGroup = AssignedUserGroups.findOne({ userGroupId});
    		if (userGroup && userGroup.groupOrder == 1) {
    			useCustomDefaultLogo = 'Yes';
    			useCustomBoardColor = 'Yes';
    		}
    		
    		AssignedUserGroups.insert({
    			userId: selectedUserId,
    			userGroupId,
    			groupOrder,
    			useCustomDefaultLogo
    		}, (err, res) => {
        	this.setLoading(false);
          if (err) {
          	var message = '';
          	if (err.error) {
            	message = TAPi18n.__(err.error);
          	} else {
          		message = err;
          	}
            $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse errorResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="errorResponse"><b>'+message+'</b></p>');
            $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
              $(this).remove();
            });
          } else if (res) {
          	var message = TAPi18n.__('added-member-successfully');
            $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse successResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="successResponse"><b>'+message+'</b></p>');
            $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
              $(this).remove();
            });
          }
        });
    	
    	AssignedUserGroups.find({ 
    		userId: selectedUserId, useCustomDefaultLogo:'Yes' , useCustomDefaultBoardColor:'Yes'
        }).forEach((aUG) => {
        	AssignedUserGroups.update({_id: aUG._id},
        			{$set: {
        				useCustomDefaultLogo:'No',
        				useCustomDefaultBoardColor:'No'
        			}
        	});
        });
    },

    	'change #js-select-group-admin'(evt) {
        // clearing any immediate previous response
        if ($('.errorResponse').length > 0 || $('.successResponse').length > 0) {
        	$('a.manageUserGroupResponse').empty();
        }
    		const userGroupId = $('.userGroupTitle').data('user-group-id');
    		const userId = $("#js-select-group-admin option:selected").val();
    		const assignedUG = AssignedUserGroups.findOne({ userGroupId, userId });
    		if (assignedUG && assignedUG._id) {
      		AssignedUserGroups.update(
    				{ _id: assignedUG._id },
    				{ $set: {
    					groupAdmin: 'Yes'
  					} },
    				(err, res) => {
  	        	this.setLoading(false);
  	          if (err) {
  	          	var message = '';
  	          	if (err.error) {
  	            	message = TAPi18n.__(err.error);
  	          	} else {
  	          		message = err;
  	          	}
  	            $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse errorResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="errorResponse"><b>'+message+'</b></p>');
  	            $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
  	              $(this).remove();
  	            });
  	          } else if (res) {
  	          	var message = TAPi18n.__('group-admin-set-successfully');
  	            $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse successResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="successResponse"><b>'+message+'</b></p>');
  	            $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
  	              $(this).remove();
  	            });
  	          }
  	        }
  				);
    		}
    	},

    	'click .unsetUserGroupAdmin'(evt) {
        // clearing any immediate previous response
        if ($('.errorResponse').length > 0 || $('.successResponse').length > 0) {
        	$('a.manageUserGroupResponse').empty();
        }
    		const userGroupId = $('.userGroupTitle').data('user-group-id');
    		const userId = $(evt.target).data('user-id');
    		const assignedUG = AssignedUserGroups.findOne({ userGroupId, userId });
    		if (assignedUG && assignedUG._id) {
      		AssignedUserGroups.update(
    				{ _id: assignedUG._id },
    				{ $set: {
    					groupAdmin: 'No'
  					} },
    				(err, res) => {
  	        	this.setLoading(false);
  	          if (err) {
  	          	var message = '';
  	          	if (err.error) {
  	            	message = TAPi18n.__(err.error);
  	          	} else {
  	          		message = err;
  	          	}
  	            $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse errorResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="errorResponse"><b>'+message+'</b></p>');
  	            $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
  	              $(this).remove();
  	            });
  	          } else if (res) {
  	          	var message = TAPi18n.__('group-admin-unset-successfully');
  	            $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse successResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="successResponse"><b>'+message+'</b></p>');
  	            $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
  	              $(this).remove();
  	            });
  	          }
  	        }
  				);
    		}
    	},

    	'click .buttonRemoveMember'(evt) {
        swal({
          title: 'Confirm remove member out of User Group!',
          text: 'Are you sure?',
          icon: "warning",
          buttons: [true, 'Remove'],
          dangerMode: true,
        })
        .then((okDelete) => {
          if (okDelete) {
        		const userGroupId = $('.userGroupTitle').data('user-group-id');
        		const userId = $(evt.target).data('user-id');
        		const assignedUG = AssignedUserGroups.findOne({ userId, userGroupId });
        		if (assignedUG && assignedUG._id) {
        			AssignedUserGroups.remove({_id: assignedUG._id}, (err, res) => {
              	if (err) {
              		swal(err, {
                    icon: "success",
                  });
              	} else if (res) {
              		const user = Users.findOne({_id: userId});
              		var message = '';
              		if (user && user._id) {
              			message = user.username + TAPi18n.__(' is out of the User Group');
              		} else {
              			message = TAPi18n.__('Successfully removed user from the User Group');
              		}
              		swal(message, {
                    icon: "success",
                  });
              	}
              });
        		}
          } else {
            return false;
          }
        });
    	},

    	'click .errorResponse, click .successResponse'(evt) {
    		const responseId = $(evt.target).parent().closest('a').attr('id');
    		$('#'+responseId).empty();
    	},

      submit(evt) {
        evt.preventDefault();

        // clearing any immediate previous response
        if ($('.errorResponse').length > 0 || $('.successResponse').length > 0) {
        	$('a.manageUserGroupResponse').empty();
        }

        const userGroupId = $('.userGroupTitle').data('user-group-id');
        const title = $('.userGroupTitle').data('user-group-title');
        const usersQuota = this.find('.js-user-group-users-quota').value.trim();
        const boardsQuota = this.find('.js-user-group-boards-quota').value.trim();

        var leftBlank = ['undefined', null, ''];
        var boardsQuotaLeftBlank = leftBlank.indexOf(boardsQuota) > -1;
        var usersQuotaLeftBlank = leftBlank.indexOf(usersQuota) > -1;
        $('.user-group-not-edited').hide();
        if (boardsQuotaLeftBlank) {
        	this.$('.boards-quota-blank').show();
        }
        if (usersQuotaLeftBlank) {
        	this.$('.users-quota-blank').show();
        }
        if (boardsQuotaLeftBlank || usersQuotaLeftBlank) {
          return false;
        }
        this.setLoading(true);

        UserGroups.update(
      		{ _id: userGroupId },
      		{ $set: { title, boardsQuota, usersQuota } },
      		(err, res) => {
	        	this.setLoading(false);
	        	$("#modal").scrollTop(0);
	          if (err) {
	          	var message = '';
	          	if (err.error) {
	            	message = TAPi18n.__(err.error);
	          	} else {
	          		message = err;
	          	}
	            $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse errorResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="errorResponse"><b>'+message+'</b></p>');
	            $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
	              $(this).remove();
	            });
	          } else if (res) {
	          	var message = TAPi18n.__('user-group-edited');
	            $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse successResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="successResponse"><b>'+message+'</b></p>');
	            $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
	              $(this).remove();
	            });
	          }
	        }
    		);
      },

      'click #deleteUGButton'() {
        const userGroupId = $('.userGroupTitle').data('user-group-id');
        swal({
          title: 'Confirm Delete User-Group!',
          text: 'Are you sure?',
          icon: "warning",
          buttons: [true, 'Remove'],
          dangerMode: true,
          closeOnClickOutside: false,
        })
        .then((okDelete) => {
          if (okDelete) {
            UserGroups.remove({_id: userGroupId}, (err, res) => {
            	if (err) {
            		swal(err, {
                  icon: "success",
                });
            	} else if (res) {
            		swal("User-Group has been deleted!", {
                  icon: "success",
                });
            		Modal.close('editUserGroup');
            	}
            });
          } else {
            return false;
          }
        });
      },

      'click #openModalLogoSettings'() {
        $('.manageUserGroupResponse').empty();
        $('.modal-close-btn').hide();
        $('#manageUserGroupBaseModal').addClass('hide');
        $('#manageUserGroupBoardColor').addClass('hide');
        $('#manageUserGroupLogo').removeClass('hide');
      },

      'click #openModalBoardColorSettings'() {
        $('.manageUserGroupResponse').empty();
        $('.modal-close-btn').hide();
        $('#manageUserGroupBaseModal').addClass('hide');
        $('#manageUserGroupLogo').addClass('hide');
        $('#manageUserGroupBoardColor').removeClass('hide');
      },

      'click .goBackToManageUserGroupBaseModal'() {
        $('.manageUserGroupResponse').empty();
        $('#manageUserGroupBoardColor').addClass('hide');
        $('#manageUserGroupLogo').addClass('hide');
        $('#manageUserGroupBaseModal').removeClass('hide');
        $('.modal-close-btn').show();
      },

      'click .uploadLogo'() {
        this.$('.uploadLogoInput').click();
      },

      'change .uploadLogoInput'(evt) {
        $('.warning').empty();
        var userGroupId = $('.userGroupTitle').data('user-group-id');
        let file, fileUrl;

        FS.Utility.eachFile(evt, (f) => {
          try {
            var fileObj = new FS.File(f);
            fileObj.name(Math.random().toString(36));
            file = Logos.insert(fileObj);
            fileUrl = file.url(this.logoUrlOptions());
          } catch (e) {
            this.setError('Error uploading file! Check file size');
          }
        });

        if (fileUrl) {
          this.setError('');
          const fetchLogoInterval = window.setInterval(() => {
            $.ajax({
              url: fileUrl,
              success: () => {
                this.setLogo(file.url(this.logoUrlOptions()), userGroupId);
                window.clearInterval(fetchLogoInterval);
              },
            });
          }, 100);
        }
      },

      'click .closeResponse'() {
        $('a.manageUserGroupResponse a,p').remove();
      },

      'click .setOrUnsetUserGroupLogoForMember'(evt) {
        const userId = $(evt.target).data('user-id');
        const userGroupId = $('.userGroupTitle').data('user-group-id');
        const checkedOption = $('[name=setOrUnsetUserGroupLogoForMember' + userId + ']:checked').val();

    		const assignedUG = AssignedUserGroups.findOne({ userGroupId, userId });
    		if (assignedUG && assignedUG._id) {
          // 1. First set the selcted choice for that user's assigned user group
          AssignedUserGroups.update(
            { _id: assignedUG._id },
            { $set: {
              useCustomDefaultLogo: checkedOption
            } },
            (err, res) => {
              this.setLoading(false);
              if (err) {
                var message = '';
                if (err.error) {
                  message = TAPi18n.__(err.error);
                } else {
                  message = err;
                }
                $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse errorResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="errorResponse"><b>'+message+'</b></p>');
                $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
                  $(this).remove();
                });
              } else if (res) {
                if (!$('a.manageUserGroupResponse > a.closeResponse').is(":visible")) {
                  var message = 'changes saved successfully';
                  $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse successResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="successResponse"><b>'+message+'</b></p>');
                  $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
                    $(this).remove();
                  });
                }
              }
            }
          );

          // 2. Then check if the choice was yes or no.
          // If it was yes, set "No" to all of his other assigned user groups
          if (checkedOption === 'Yes') {
            const currentAssignedUGId = assignedUG._id;
            AssignedUserGroups.find({
              _id: { $ne: currentAssignedUGId },
              userId: userId,
            }).forEach((aUG) => {
              AssignedUserGroups.update(
                { _id: aUG._id },
                { $set: {
                  useCustomDefaultLogo: 'No'
                } }
              );
            });
          }
        }
      },
    'click .setOrUnsetUserBoardColorForMember'(evt) {
         const userId = $(evt.target).data('user-id');
         const userGroupId = $('.userGroupTitle').data('user-group-id');
         const checkedOption = $('[name=defaultBoardColor' + userId + ']:checked').val();
         
         const assignedUserGroup = AssignedUserGroups.findOne({ userGroupId, userId });
         if (assignedUserGroup && assignedUserGroup._id) {
             AssignedUserGroups.update(
                 { _id: assignedUserGroup._id},
                 { $set: { useCustomDefaultBoardColor: checkedOption} },
                 (err, res) => {
                     this.setLoading(false);
                     if (err) {
                         var message = '';
                         if (err.error) {
                         message = TAPi18n.__(err.error);
                     } else {
                         message = err;
                     }
                         $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse errorResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="errorResponse"><b>'+message+'</b></p>');
                         $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
                             $(this).remove();
                         });
                     } else if (res) {
                    	 if (!$('a.manageUserGroupResponse > a.closeResponse').is(":visible")) {
                    		 var message = 'changes saved successfully';
                             $('a.manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse successResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="successResponse"><b>'+message+'</b></p>');
                             $('a.manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
                                 $(this).remove();
                             });
                          }
                     }
                 }
               );
             if (checkedOption === 'Yes') {
                 const currentAssignedUserGroupId = assignedUserGroup._id;
                 AssignedUserGroups.find({
                   _id: { $ne: currentAssignedUserGroupId },
                   userId: userId,
                 }).forEach((aUG) => {
                   console.log(aUG);
                   AssignedUserGroups.update(
                     { _id: aUG._id },
                     { $set: {
                    	 useCustomDefaultBoardColor: 'No'
                     } }
                   );
                 });
               }
             }
         },
         
         'change .setBoardColor'(evt) {
              const boardColor = evt.target.value;
              const userGroupId = Session.get('manageUserGroupId');
              const userGroup = UserGroups.findOne({_id: userGroupId});
              if (userGroup && userGroup._id) {
                  userGroup.setBoardColor(boardColor);
              }
         },
      }];
  },
}).register('editUserGroup');

Template.editUserGroup.helpers({
  hasLogo() {
	const groupId = Session.get('manageUserGroupId');
    const userGroup = UserGroups.findOne({_id: groupId});
    if (userGroup && userGroup._id && userGroup.logoUrl) {
      return true
    } else {
      return false;
    }
  },

  logoUrl(userGroupId) {
    const userGroup = UserGroups.findOne({_id: userGroupId});
    if (userGroup && userGroup._id && userGroup.logoUrl) {
      return userGroup.logoUrl
    } else {
      return '#';
    }
  },
  
  useCustomDefaultLogo(userId) {
    const groupId = Session.get('manageUserGroupId');
    const assignedUG = AssignedUserGroups.findOne({
      userGroupId: groupId,
      userId: userId
    });
    if (assignedUG && assignedUG._id && assignedUG.groupOrder && assignedUG.groupOrder === 1 && assignedUG.useCustomDefaultLogo && assignedUG.useCustomDefaultLogo === 'Yes') {
      return true;
	} else {
      return false;
    }
  },

	hasUsersAssignedToIt() {
		const groupId = Session.get('manageUserGroupId');
		const assignedUGs = AssignedUserGroups.find({userGroupId: groupId});
		if (assignedUGs.count() > 0) {
			return true;
		}
		return false;
	},

	lessThan4Members() {
		const groupId = Session.get('manageUserGroupId');
		const assignedUGs = AssignedUserGroups.find({userGroupId: groupId});
		if (assignedUGs.count() < 4) {
			return true;
		} else {
			return false;
		}
	},

	lessThan4GroupAdmins() {
		const groupId = Session.get('manageUserGroupId');
		const assignedUGs = AssignedUserGroups.find({userGroupId: groupId, groupAdmin: {$in: ['Yes', 'yes']} });
		if (assignedUGs.count() < 4) {
			return true;
		} else {
			return false;
		}
	},

	users() {
		const groupId = Session.get('manageUserGroupId');
		const userGroupMembersIds = new Array();
	  AssignedUserGroups.find({userGroupId: groupId}).forEach((assignedUG) => {
	  	userGroupMembersIds.push(assignedUG.userId);
	  });
    return Users.find({_id: {$in: userGroupMembersIds}});
  },

	userGroup() {
		const userGroupId = Session.get('manageUserGroupId');
    return UserGroups.findOne(userGroupId);
  },

  notAsssignedToAnyUser() {
		const userGroupId = Session.get('manageUserGroupId');
  	const assignedGroup = AssignedUserGroups.findOne({userGroupId: userGroupId});
  	if (!assignedGroup) {
  		return true;
  	} else {
    	return false;
  	}
  },

  notUserGroupMember() {
		const groupId = Session.get('manageUserGroupId');
		const userGroupMembersIds = new Array();
	  AssignedUserGroups.find({userGroupId: groupId}).forEach((assignedUG) => {
	  	userGroupMembersIds.push(assignedUG.userId);
	  });
    return Users.find({_id: {$nin: userGroupMembersIds}});
  },

  canAddMoreMember() {
		const groupId = Session.get('manageUserGroupId');
		const userGroupMembersIds = new Array();
	  AssignedUserGroups.find({userGroupId: groupId}).forEach((assignedUG) => {
	  	userGroupMembersIds.push(assignedUG.userId);
	  });
    const users = Users.find({_id: {$nin: userGroupMembersIds}});
		if (users.count() > 0) {
	    return true;
		} else {
	    return false;
		}
  },

  groupAdmins() {
		const groupId = Session.get('manageUserGroupId');
		const userIds = new Array();
		AssignedUserGroups.find({ userGroupId: groupId, groupAdmin: {$in: ['Yes', 'yes']} }).forEach((assignedUG) => {
			userIds.push(assignedUG.userId);
		});
		return Users.find({ _id: {$in: userIds} });
  },

  canAddMoreGroupAdmin() {
		const groupId = Session.get('manageUserGroupId');
	  const assignedUGs = AssignedUserGroups.find({userGroupId: groupId});
    const userGroupAdmins = AssignedUserGroups.find({ userGroupId: groupId, groupAdmin: {$in: ['Yes', 'yes']} });
		if (assignedUGs.count() > userGroupAdmins.count()) {
	    return true;
		} else {
	    return false;
		}
  },

  userGroupNonAdmins() {
		const groupId = Session.get('manageUserGroupId');
		const userGroupNonAdminIds = new Array();
	  AssignedUserGroups.find({ userGroupId: groupId, groupAdmin: {$nin: ['Yes', 'yes']} }).forEach((assignedUGNonAdmin) => {
	  	userGroupNonAdminIds.push(assignedUGNonAdmin.userId);
	  });
	  return Users.find({ _id: {$in: userGroupNonAdminIds} });
  },

  hasGroupAdmin() {
		const groupId = Session.get('manageUserGroupId');
	  const assignedUG = AssignedUserGroups.findOne({ userGroupId: groupId, groupAdmin: {$in: ['Yes', 'yes']} });
	  if (assignedUG && assignedUG._id) {
	  	return true;
	  } else {
	    return false;
		}
  },

  isUserGroupAmin() {
		const groupId = Session.get('manageUserGroupId');
	  const userGroupAdmin = AssignedUserGroups.find({
      userGroupId: groupId,
      userId: Meteor.user()._id,
      groupAdmin: {$in: ['Yes', 'yes']}
    });

    if (userGroupAdmin.count() > 0) {
      return true;
    } else {
      return false;
    }
  },

  userGroupAdmins() {
		const groupId = Session.get('manageUserGroupId');
		const userGroupAdminIds = new Array();
	  AssignedUserGroups.find({ userGroupId: groupId, groupAdmin: {$in: ['Yes', 'yes']} }).forEach((assignedUGAdmin) => {
	  	userGroupAdminIds.push(assignedUGAdmin.userId);
	  });
	  return Users.find({ _id: {$in: userGroupAdminIds} });
  },
  
  useCustomBoardColor(userId) {
    const groupId = Session.get('manageUserGroupId');
    const assignedUG = AssignedUserGroups.findOne({ userGroupId: groupId,userId: userId });
    
    if (assignedUG && assignedUG._id && assignedUG.groupOrder && assignedUG.groupOrder === 1 && assignedUG.useCustomDefaultBoardColor && assignedUG.useCustomDefaultBoardColor === 'Yes') {
        return true;
    } else {
        return false;
    }
  },
  
  boardColor() {
    const groupId = Session.get('manageUserGroupId');
    const assignedUserGroups = AssignedUserGroups.findOne({userGroupId: groupId, userId: Meteor.user()._id })
    
    if (assignedUserGroups && assignedUserGroups._id && assignedUserGroups.groupOrder && assignedUserGroups.groupOrder === 1 ) {
        const userGroup = UserGroups.findOne({_id: assignedUserGroups.userGroupId });
        if (userGroup && userGroup.defaultBoardColor) {
            return userGroup.defaultBoardColor;
        } else {
        	return '#2980B9';
        }
    }
    return '#2980B9';
  }
});
BlazeComponent.extendComponent({

  events() {
    return [{
    	'click #openMailClient': function(e) {
    		const userId = $(e.target).data('userid');
    		const user = Users.findOne({_id: userId});
    		let email = user.emails[0].address;
        
    		window.location.href='mailto:'+email;
    		
    	}
    }];
  }
}).register('viewEmail');

Template.viewEmail.helpers({
  emailContents() {
    const userid = Session.get('manageUserId');
	  const user = Users.findOne({_id: userid });
	  const contents = {};
	  const logoUrl = Meteor.absoluteUrl() + 'rh-logo.png';
	  const board = Boards.findOne({_id: Session.get('currentBoard')});
	  const lang = user.profile.language == undefined ? 'nl' : user.profile.lang;
	  
	  if (user && user._id) {
	    contents.user = user ;
	  }
	  
	  if (user && user.services && user.services.password && user.services.password.bcrypt) {
	  	const inviter = Meteor.user();
	  	const params = {user: user.username,
	  			            inviter: inviter.username,
	  			            board: board.title,
	  			            url: board.absoluteUrl(),
	  	                logoUrl: logoUrl
	  		             }
	                                   
	  	contents.email = TAPi18n.__('email-invite-text', params, lang);
	  } else {
	  	const token = user.services.password.reset.token;
	  	const enrollLink = Meteor.absoluteUrl()+'enroll-account/'+token;
		  contents.email = TAPi18n.__('email-enroll-text',{user: user.username, enrollUrl:enrollLink, logoUrl: logoUrl}, lang);
	  }
	  return contents;
	 }
});
BlazeComponent.extendComponent({
  plans() {
    return Plans.find();
  },
}).register('plansGeneral');

Template.planRow.helpers({
	plan() {
    return Plans.findOne(this.planId);
  },
});

BlazeComponent.extendComponent({
	subscriptions() {
		return Subscriptions.find({archived: {$ne: true}});
  },

  events() {
    return [{
      'click #add-subscription': Popup.open('addSubscription'),
    }];
  },
}).register('subscriptionsGeneral');

Template.subscriptionRow.onRendered(() => {
  const subscriptionId = Template.instance().data.subscriptionId;
  const subscription = Subscriptions.findOne({_id: subscriptionId});
  if (subscription && subscription._id) {
  	const currentDateTime = new Date();
  	if (currentDateTime > subscription.expiresOn) {
  		$(Template.instance().firstNode).addClass('expired');
  	}
  }
});

Template.subscriptionRow.helpers({
	subscription() {
    const subscription = Subscriptions.findOne(this.subscriptionId);
    if (subscription && subscription._id) {
    	const plan = Plans.findOne(subscription.planId);
    	if (plan && plan._id) {
    		subscription.planTitle = plan.title;
    	}
    	const userGroup = UserGroups.findOne(subscription.userGroupId);
    	if (userGroup && userGroup._id) {
    		subscription.userGroupTitle = userGroup.title;
    	}
    	const user = Users.findOne(subscription.subscriberId);
    	if (user && user._id) {
    		subscription.subscriberUsername = user.username;
    	}
    }
    return subscription;
  },
});

Template.subscriptionRow.events({

  'click .renewSubscription'(e) {
    const subscriptionId = $(e.target).data('subscription-id');
    const subscription = Subscriptions.findOne({_id: subscriptionId});
    if (subscription && subscription._id) {
      const user = Users.findOne({_id: subscription.subscriberId});
      const plan = Plans.findOne({_id: subscription.planId});
      const userGroup = UserGroups.findOne({_id: subscription.userGroupId});
      if (user && user._id && plan && plan._id && userGroup && userGroup._id) {
        swal({
          title: 'Confirm renewal of subscription!',
          text: "Renew "+user.username+"'s subscription of UserGroup '"+userGroup.title+"' to Plan '"+plan.title+"'?",
          icon: 'info',
          buttons: ['No', 'Yes'],
          dangerMode: false,
        })
        .then((okDelete) => {
          if (okDelete) {
            // Upon a renewal, there are two case scenarios, either of which is going to play out here,
            // first one is if the subscription is expired or having status "cancelled", in this one both the expiration date and the quotas are updated and
            // the second one is if the subscription is not expired yet and its status is also not "cancelled", in this one, only the quotas are updated and the expiration date stays the same
            // In Both cases, the fields priceSubscribedTo, the assignerId, the status and the statusSetOn too are updated
            // The plan cannot be changed upon a renewal
            // The userGroups' quota is replenished with that of the subscribed plan's quota
            var priceSubscribedTo = null;
            var statusSetOn = new Date();
            statusSetOn.setHours(0,0,0,0);
            var expiresOn = new Date();
            expiresOn.setHours(0,0,0,0);
          	if (subscription.billingCycle === 'monthly') {
              expiresOn.setMonth(expiresOn.getMonth()+1);
            	priceSubscribedTo = plan.pricePerMonth;
          	} else if (subscription.billingCycle === 'yearly') {
              expiresOn.setMonth(expiresOn.getMonth()+12);
            	priceSubscribedTo = plan.pricePerYear;
          	}

          	const expirationDate = new Date(subscription.expiresOn);
        		expirationDate.setHours(0,0,0,0);
          	const currentDate = new Date();
            currentDate.setHours(0,0,0,0);
            var fieldsToUpdate = {};
            if (typeof subscription.status !== 'string') {
              subscription.status = '';
            }
          	if (expirationDate < currentDate || expirationDate === currentDate || subscription.status === 'cancelled') {
              fieldsToUpdate = {
                expiresOn,
                priceSubscribedTo,
                assignerId: Meteor.user()._id,
                status: 'renewed',
                statusSetOn
              };
          	} else {
              fieldsToUpdate = {
                priceSubscribedTo,
                assignerId: Meteor.user()._id,
                status: 'renewed',
                statusSetOn
              };
            }

            Subscriptions.update(
          		{ _id: subscriptionId }, {
          			$set: fieldsToUpdate
	            }, (err, res) => {
	              if (err) {
	              	var message = '';
	              	if (err.error) {
	                	message = TAPi18n.__(err.error);
	              	} else {
	              		message = err;
	              	}
	                var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
	                $('#header-main-bar').before($errorMessage);
	                $errorMessage.delay(10000).slideUp(500, function() {
	                  $(this).remove();
	                });
	              } else if (res) {
	                UserGroups.update(
	              		{ _id: userGroup._id }, {
	              			$set : {
	              				usersQuota: plan.usersQuota + userGroup.usersQuota,
	              				boardsQuota: plan.boardsQuota + userGroup.boardsQuota,
	              			}
	    	            }, (err, res) => {
	    	              if (err) {
	    	              	var message = '';
	    	              	if (err.error) {
	    	                	message = TAPi18n.__(err.error);
	    	              	} else {
	    	              		message = err;
	    	              	}
	    	                var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
	    	                $('#header-main-bar').before($errorMessage);
	    	                $errorMessage.delay(10000).slideUp(500, function() {
	    	                  $(this).remove();
	    	                });
	    	              } else if (res) {
	    	                if ($(e.target).closest('tr').hasClass('expired')) {
	    	                	$(e.target).closest('tr').removeClass('expired');
	    	                }
	    	              	var message = TAPi18n.__('subscription-renewed-successfully');
	    	                var $successMessage = $('<div class="successStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
	    	                $('#header-main-bar').before($successMessage);
	    	                $successMessage.delay(10000).slideUp(500, function() {
	    	                  $(this).remove();
	    	                });

	    	                const subscriber = user.username;
	    	                const planTitle = plan.title;
	    	                const userGroupTitle = userGroup.title;
	    	                const subscriberEmail = user.emails[0].address;
    	    		  	      const lang = 'en-GB';
    	    		  	      if (user.profile && user.profile.language && user.profile.language.length > 0) {
    	    		  	      	lang = user.profile.language;
    	    		  	      }
    	    		  	      const params = { subscriber, planTitle, userGroupTitle, };

    	    		          Meteor.call('mailSubscriptionRenewalSuccess', subscriberEmail, lang, params, (err, ret) => {
    	    		            if (err) {
    	    	              	var message = '';
    	    	              	if (err.error) {
    	    	                	message = TAPi18n.__(err.error) + TAPi18n.__('mail-not-sent');
    	    	              	} else {
    	    	              		message = err + TAPi18n.__('mail-not-sent');
    	    	              	}
    	    	                var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
    	    	                $('#header-main-bar').before($errorMessage);
    	    	                $errorMessage.delay(10000).slideUp(500, function() {
    	    	                  $(this).remove();
    	    	                });
    	    		            } else if (ret.output && ret.output != 'success') {
    	    	              	var message = ret.output + TAPi18n.__('mail-not-sent');
    	    	                var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
    	    	                $('#header-main-bar').before($errorMessage);
-    	    	                $errorMessage.delay(10000).slideUp(500, function() {
    	    	                  $(this).remove();
    	    	                });
    	    		            } else if (ret.output && ret.output == 'success') {
    	    			          	var message = TAPi18n.__('successfully-mailed-subscriber');
    	    			            var $successMessage = $('<div class="successStatus inviteSent"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
    	    			            $('#header-main-bar').before($successMessage);
    	    			            $successMessage.delay(10000).slideUp(500, function() {
    	    			              $(this).remove();
    	    			            });
    	    		            }
    	    		          });
	    	              }
	    	            }
	                );
	              }
	            }
            );
          } else {
            return false;
          }
        });
      }
    }
  },

  'click .upgradeSubscription'(e) {
    const subscriptionId = $(e.target).data('subscription-id');
		Popup.open('upgradeSubscription')(e);
    Session.set('upgradeSubscriptionOfIdentifier', subscriptionId);
  },

  'click .archiveSubscription'(e) {
    const subscriptionId = $(e.target).data('subscription-id');
    const subscription = Subscriptions.findOne(subscriptionId);
    if (subscription && subscription._id) {
    	const user = Users.findOne(subscription.subscriberId);
    	const userGroup = UserGroups.findOne(subscription.userGroupId);
    	const plan = Plans.findOne(subscription.planId);
    	if (user && user.username && userGroup && userGroup.title && plan && plan.title) {
        swal({
          title: 'Confirm subscription cancellation!',
          text: "Cancel "+user.username+"'s subscription of UserGroup '"+userGroup.title+"' to Plan '"+plan.title+"'?",
          icon: 'warning',
          buttons: ['No', 'Yes'],
          dangerMode: true,
        })
        .then((okDelete) => {
          if (okDelete) {
          	Subscriptions.update(
        			{ _id: subscriptionId }, {
        				$set: {
        					archived: true,
        				}
        			}, (err, res) => {
	            	if (err) {
	            		swal(err, {
	                  icon: "error",
	                });
	            	} else if (res) {
	            		UserGroups.update(
            				{_id: subscription.userGroupId}, {
            					$set: {
            						usersQuota: 0,
            						usedUsersQuota: 0,
            						boardsQuota: 0,
            						usedBoardsQuota: 0,
            					}
            				}, (err, res) => {
      	            	if (err) {
      	            		swal(err, {
      	                  icon: "error",
      	                });
      	            	} else if (res) {
      	            		var message = TAPi18n.__('subscription_was_successfully_archived');
      	            		swal(message, {
      	                  icon: "success",
      	                });
      	            	}
              			}
          				);

	            	}
        			}
      			);
          } else {
            return false;
          }
        });
    	}
    }
  },

});

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },

	onRendered() {
    this.setLoading(false);

		// had to use two different session keys and setting them in different stages as the popup calls its helper function twice each time it opens and this was not setting
		// the session for the key 'upgradeSubscriptionOfId' with the right value at both times, it was either the in the first call or the second call that the right value was being set.
		// But using the two session keys 'upgradeSubscriptionOfIdentifier' and 'upgradeSubscriptionOfId', and setting/getting them at different stages and deleting the keys when the popup closes,
		// made sure that the popup's helper funstion would always set the right value for the key 'upgradeSubscriptionOfId'
		const subscriptionId = Session.get('upgradeSubscriptionOfIdentifier')
    Session.set('upgradeSubscriptionOfId', subscriptionId);
	},

	setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },

	subscription() {
		const subscriptionId = Session.get('upgradeSubscriptionOfId');
		const subscription = Subscriptions.findOne({_id: subscriptionId});
		if (subscription && subscription._id) {
			const subscriber = Users.findOne({_id: subscription.subscriberId});
			if (subscriber && subscriber._id) {
				subscription.subscriberUsername = subscriber.username;
			}
			const userGroup = UserGroups.findOne({_id: subscription.userGroupId});
			if (userGroup && userGroup._id) {
				subscription.userGroupTitle = userGroup.title;
			}
			return subscription;
		}
	},

	onDestroyed() {
		delete Session.keys['upgradeSubscriptionOfIdentifier', 'upgradeSubscriptionOfId']
	},

	plans() {
		const subscriptionId = Session.get('upgradeSubscriptionOfId');
		const subscription = Subscriptions.findOne({_id: subscriptionId});
		if (subscription && subscription._id) {
			const plan = Plans.findOne({_id: subscription.planId});
			if (plan && plan._id) {
				// Since in the future we'll need to give the admin the right to create new plans and since for now we have
				// no way of determining the inferior plans, so we'll just exclude the current plan of the subscription in the return.
				return Plans.find({_id: {$ne: plan._id}});
			}
		}
  },

  events() {
    return [{
    	submit(e) {
    		e.preventDefault();
        $('.upgradeSubscriptionErrorMsg').hide();

        const planId = this.find('.select-a-plan option:selected').value.trim();
        const billingCycle = this.find('.select-billing-cycle option:selected').value.trim();

        var notSelected = ['undefined', null, ''];
        var planNotSelected = notSelected.indexOf(planId) > -1;
        var billingCycleNotSelected = notSelected.indexOf(billingCycle) > -1;
        if (planNotSelected) {
        	$('.plan-error-msg.upgradeSubscriptionErrorMsg').show();
        }
        if (billingCycleNotSelected) {
        	$('.billing-cycle-error-msg.upgradeSubscriptionErrorMsg').show();
        }
        if (planNotSelected || billingCycleNotSelected) {
          return false;
        }

    		const subscriptionId = Session.get('upgradeSubscriptionOfId');
    		const subscription = Subscriptions.findOne({_id: subscriptionId});
    		const plan = Plans.findOne({_id: planId});
    		if (subscription && subscription._id && plan && plan._id) {
      		this.setLoading(true);

          var priceSubscribedTo = null;
          var subscribedOn = new Date();
          subscribedOn.setHours(0,0,0,0);
          var expiresOn = new Date();
          expiresOn.setHours(0,0,0,0);
        	if (billingCycle === 'monthly') {
            expiresOn.setMonth(expiresOn.getMonth()+1);
          	priceSubscribedTo = plan.pricePerMonth;
        	} else if (billingCycle === 'yearly') {
            expiresOn.setMonth(expiresOn.getMonth()+12);
          	priceSubscribedTo = plan.pricePerYear;
        	}

        	const expirationDate = new Date(subscription.expiresOn);
      		expirationDate.setHours(0,0,0,0);
        	const currentDate = new Date();
        	currentDate.setHours(0,0,0,0);
        	if (expirationDate > currentDate) {
        		var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        		const remainingDaysCount = Math.round(Math.abs((expirationDate.getTime() - currentDate.getTime()) / (oneDay)));
        		// push the var expiresOn's date by the number of remained days
        		var incrementedExpiryDate = new Date(expiresOn.setDate(expiresOn.getDate() + remainingDaysCount)).toISOString().substr(0,10);
        		var expiresOn = new Date(incrementedExpiryDate);
        		expiresOn.setHours(0,0,0,0);
        	}

          Subscriptions.update(
        		{_id: subscriptionId}, {
        			$set: {
        				planId,
        				billingCycle,
      					status: 'upgraded',
      					statusSetOn: new Date(),
      					priceSubscribedTo,
    					  subscribedOn,
    					  expiresOn,
        			}
        		}, (err, res) => {
              if (err) {
              	this.setLoading(false);
              	var message = '';
              	if (err.error) {
                	message = TAPi18n.__(err.error);
              	} else {
              		message = err;
              	}
                var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
                $('#header-main-bar').before($errorMessage);
                $errorMessage.delay(10000).slideUp(500, function() {
                  $(this).remove();
                });
              } else if (res) {
              	const plan = Plans.findOne({_id: planId});
              	// update UserGroups, overwriting its usersQuota and boardsQuota with that of the upgraded plan and
              	// resetting the user-group's usedUsersQuota and usedBoardsQuota to zero.
              	UserGroups.update(
            			{_id: subscription.userGroupId}, {
            				$set: {
            					usersQuota: plan.usersQuota,
            					usedUsersQuota: 0,
            					boardsQuota: plan.boardsQuota,
            					usedBoardsQuota: 0,
            				}
            			}, (err, res) => {
                  	this.setLoading(false);
                    if (err) {
                    	var message = '';
                    	if (err.error) {
                      	message = TAPi18n.__(err.error);
                    	} else {
                    		message = err;
                    	}
                      var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
                      $('#header-main-bar').before($errorMessage);
                      $errorMessage.delay(10000).slideUp(500, function() {
                        $(this).remove();
                      });
                    } else if (res) {
                    	var message = TAPi18n.__('subscription-upgraded-successfully');
                      var $successMessage = $('<div class="successStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
                      $('#header-main-bar').before($successMessage);
                      $successMessage.delay(10000).slideUp(500, function() {
                        $(this).remove();
                      });

                      const user = Users.findOne({_id: subscription.subscriberId});
                      const plan = Plans.findOne({_id: planId});
                      const userGroup = UserGroups.findOne({_id: subscription.userGroupId});

                      if (user && user._id && plan && plan._id && userGroup && userGroup._id) {
      	                const subscriber = user.username;
      	                const planTitle = plan.title;
      	                const userGroupTitle = userGroup.title;
      	                const subscriberEmail = user.emails[0].address;
    	    		  	      const lang = 'en-GB';
    	    		  	      if (user.profile && user.profile.language && user.profile.language.length > 0) {
    	    		  	      	lang = user.profile.language;
    	    		  	      }
    	    		  	      const params = { subscriber, planTitle, userGroupTitle, };

    	    		          Meteor.call('mailSubscriptionUpgradeSuccess', subscriberEmail, lang, params, (err, ret) => {
    	    		            if (err) {
    	    	              	var message = '';
    	    	              	if (err.error) {
    	    	                	message = TAPi18n.__(err.error) + TAPi18n.__('mail-not-sent');
    	    	              	} else {
    	    	              		message = err + TAPi18n.__('mail-not-sent');
    	    	              	}
    	    	                var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
    	    	                $('#header-main-bar').before($errorMessage);
    	    	                $errorMessage.delay(10000).slideUp(500, function() {
    	    	                  $(this).remove();
    	    	                });
    	    		            } else if (ret.output && ret.output != 'success') {
    	    	              	var message = ret.output + TAPi18n.__('mail-not-sent');
    	    	                var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
    	    	                $('#header-main-bar').before($errorMessage);
    	    	                $errorMessage.delay(10000).slideUp(500, function() {
    	    	                  $(this).remove();
    	    	                });
    	    		            } else if (ret.output && ret.output == 'success') {
    	    			          	var message = TAPi18n.__('successfully-mailed-subscriber');
    	    			            var $successMessage = $('<div class="successStatus inviteSent"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
    	    			            $('#header-main-bar').before($successMessage);
    	    			            $successMessage.delay(10000).slideUp(500, function() {
    	    			              $(this).remove();
    	    			            });
    	    		            }
    	    		          });
                      }

                      Popup.close();
                    }
                  }
          			);
              }
              Popup.close();
            }
      		);
    		}
    	},
    }];
  },
}).register('upgradeSubscriptionPopup');

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },

  onRendered() {
    this.setLoading(false);
  },

	setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },

  users() {
    return Users.find();
  },

	plans() {
    return Plans.find();
  },

  events() {
    return [{
    	'change #select-subscriber'(e) {
  			$('#user-group-error-msg').hide();
  			$('#user-group-not-selected').hide();
  			$('#already-assigned-user-group-to-subscription').hide();
  			$('#already-assigned-user-groups-to-subscriptions').hide();
    		const selector = $('select#select-a-user-group');
				selector.empty();
				selector.prop('disabled', true);
				$('#saveNewSubscription').prop('disabled', true);
    		const subscriberId = $(e.target).val();
    		const assignedUserGroups = AssignedUserGroups.find({userId: subscriberId});
    		var userGroupsIds = new Array();
    		if (assignedUserGroups && assignedUserGroups.count() > 0) {
    			assignedUserGroups.forEach((assignedUG) => {
    				userGroupsIds.push(assignedUG.userGroupId);
    			});
    		}
    		const subscribedUGs = new Array();
  			Subscriptions.find({
  				archived: {$ne: true}
  			}).forEach((subscription) => {
  				if (!subscribedUGs.includes(subscription.userGroupId)) {
    				subscribedUGs.push(subscription.userGroupId);
  				}
    		});
    		const subscriberUserGroupsOptions = UserGroups.find({
    			$and: [
    				{ _id: { $in: userGroupsIds } },
    				{ _id: { $nin: subscribedUGs } }
  				]
    		});
    		if (subscriberUserGroupsOptions && subscriberUserGroupsOptions.count() > 0) {
  				selector.prop('disabled', false);
  				$('#saveNewSubscription').prop('disabled', false);
  				selector.append('<option value="">Select One</option>');
    			subscriberUserGroupsOptions.forEach((group) => {
    				selector.append('<option value='+group._id+'>'+group.title+'</option>');
    			});
    		} else {
      		const subscriberUserGroups = UserGroups.find({_id: { $in: userGroupsIds } });
      		if (subscriberUserGroups && subscriberUserGroups.count() > 1) {
      			$('#already-assigned-user-groups-to-subscriptions').show();
      		}
      		if (subscriberUserGroups && subscriberUserGroups.count() > 0 && subscriberUserGroups.count() < 2) {
      			$('#already-assigned-user-group-to-subscription').show();
      		}
      		if (subscriberUserGroups.count() < 1) {
      			$('#user-group-error-msg').show();
      		}
    		}
    	},

    	submit(evt) {
        evt.preventDefault();
        $('.newSubscriptionErrorMsg').hide();

        const planId = this.find('.select-a-plan option:selected').value.trim();
        const billingCycle = this.find('.select-billing-cycle option:selected').value.trim();
        const subscriberId = this.find('#select-subscriber option:selected').value.trim();
        const userGroupId = this.find('#select-a-user-group option:selected').value.trim();

        var notSelected = ['undefined', null, ''];
        var planNotSelected = notSelected.indexOf(planId) > -1;
        var billingCycleNotSelected = notSelected.indexOf(billingCycle) > -1;
        var subscriberNotSelected = notSelected.indexOf(subscriberId) > -1;
        var userGroupNotSelected = notSelected.indexOf(userGroupId) > -1;
        if (planNotSelected) {
        	$('.plan-error-msg.newSubscriptionErrorMsg').show();
        }
        if (billingCycleNotSelected) {
        	$('.billing-cycle-error-msg.newSubscriptionErrorMsg').show();
        }
        if (subscriberNotSelected) {
        	$('#subscriber-error-msg.newSubscriptionErrorMsg').show();
        }
        if (userGroupNotSelected) {
        	$('#user-group-not-selected.newSubscriptionErrorMsg').show();
        }
        if (planNotSelected || billingCycleNotSelected || subscriberNotSelected || userGroupNotSelected) {
          return false;
        }

        var priceSubscribedTo = null;
        var subscribedOn = new Date();
        var expiresOn = new Date();
        const plan = Plans.findOne({_id: planId});
        if (plan && plan._id) {
        	if (billingCycle === 'monthly') {
          	priceSubscribedTo = plan.pricePerMonth;
            expiresOn.setMonth(expiresOn.getMonth()+1);
        	} else if (billingCycle === 'yearly') {
          	priceSubscribedTo = plan.pricePerYear;
            expiresOn.setMonth(expiresOn.getMonth()+12);
        	}
        }

      	this.setLoading(true);
        Subscriptions.insert({
        	planId,
          userGroupId,
          subscriberId,
          subscribedOn,
          expiresOn,
          billingCycle,
          priceSubscribedTo,
          assignerId: Meteor.user()._id
        }, (err, res) => {
        	this.setLoading(false);
          if (err) {
          	var message = '';
          	if (err.error) {
            	message = TAPi18n.__(err.error);
          	} else {
          		message = err;
          	}
            var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
            $('#header-main-bar').before($errorMessage);
            $errorMessage.delay(10000).slideUp(500, function() {
              $(this).remove();
            });
          } else if (res) {
          	var message = TAPi18n.__('new-subscription-added');
            var $successMessage = $('<div class="successStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
            $('#header-main-bar').before($successMessage);
            $successMessage.delay(10000).slideUp(500, function() {
              $(this).remove();
            });

            const user = Users.findOne({_id: subscriberId});
            const plan = Plans.findOne({_id: planId});
            const userGroup = UserGroups.findOne({_id: userGroupId});

            if (user && user._id && plan && plan._id && userGroup && userGroup._id) {
              const subscriber = user.username;
              const planTitle = plan.title;
              const userGroupTitle = userGroup.title;
              const subscriberEmail = user.emails[0].address;
		  	      const lang = 'en-GB';
		  	      if (user.profile && user.profile.language && user.profile.language.length > 0) {
		  	      	lang = user.profile.language;
		  	      }
		  	      const params = { subscriber, planTitle, userGroupTitle, };

		          Meteor.call('mailNewSubscriptionSuccess', subscriberEmail, lang, params, (err, ret) => {
		            if (err) {
	              	var message = '';
	              	if (err.error) {
	                	message = TAPi18n.__(err.error) + TAPi18n.__('mail-not-sent');
	              	} else {
	              		message = err + TAPi18n.__('mail-not-sent');
	              	}
	                var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
	                $('#header-main-bar').before($errorMessage);
	                $errorMessage.delay(10000).slideUp(500, function() {
	                  $(this).remove();
	                });
		            } else if (ret.output && ret.output != 'success') {
	              	var message = ret.output + TAPi18n.__('mail-not-sent');
	                var $errorMessage = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
	                $('#header-main-bar').before($errorMessage);
	                $errorMessage.delay(10000).slideUp(500, function() {
	                  $(this).remove();
	                });
		            } else if (ret.output && ret.output == 'success') {
			          	var message = TAPi18n.__('successfully-mailed-subscriber');
			            var $successMessage = $('<div class="successStatus inviteSent"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
			            $('#header-main-bar').before($successMessage);
			            $successMessage.delay(10000).slideUp(500, function() {
			              $(this).remove();
			            });
		            }
		          });
            }

            Popup.close();
          }
        });
      },

      'click #cancelButton'() {
        Popup.close();
      },
    }];
  },
}).register('addSubscriptionPopup');

BlazeComponent.extendComponent({
	  onCreated() {
	   this.loading = new ReactiveVar(false);
	  },
	  
	 onRendered() {
	  	
	 },
	  
  events() {
     return[{
    		'click a.impersonate-user' : function() {
    			  var userId = Session.get('impersonatedUser');
    			  cb = function() {};
    		    var fromUser = Meteor.userId();
    		  	if (!fromUser) throw new Error("Permission denied. You need to be logged in to impersonate users.");
    		  	var fromToken = Accounts._storedLoginToken();
    		    Accounts.callLoginMethod({
    		  	  methodArguments: [{
    		  	    impersonateUser: userId,
    		  	  }],
    		  	  userCallback: function(err) {
  		  	      if (err) {
  		  	      	var $message = $('<div class="errorStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+err+'</b></p></div>');
  		          	$('#header-main-bar').before($message);
  		            $message.delay(10000).slideUp(500, function() {
  		              $(this).remove();
  		            });
  		  	      }
  		  	      
  		  	      if (!err && Meteor._localStorage.getItem('impersonate.loginToken') == null) {
  		  	        // Store initial user in local storage allowing us to return to this user
  		  	        Meteor._localStorage.setItem('impersonate.userId', fromUser);
  		  	        Meteor._localStorage.setItem('impersonate.loginToken', fromToken);
  		  	        FlowRouter.go('/');
  		  	      }
  		  	      cb.apply(this, [err, userId]);
    		  	  }
    		  });
    		
    		}
    	}]
  }
}).register('settingsUserPopup');


Template.peopleGeneral.events({
  'click .edit-user':function(evt) {
    const userId = $(evt.target).data('id');
    Session.set('selectedUser', userId);
  },
  'click .more-settings':function(evt) {
    const userId = $(evt.target).parent().data('id');
    Session.set('impersonatedUser', userId);
  },
});

Template.peopleGeneral.helpers({
	users() {
		const isAdmin = Meteor.user().isAdmin;
		if (isAdmin) {
			return Users.find({'emails.verified':true});
		}
		
		if (!isAdmin && Meteor.user().roleName === 'Manager') {
		  const role = Roles.findOne({name: 'Manager'});
	    if (role && role._id) {
	    	const userId = Meteor.user()._id;
	    	var userUserGroupsIds = new Array();
	  		AssignedUserGroups.find({userId}).forEach((assignedUserGroup) => {
	  			if (!userUserGroupsIds.includes(assignedUserGroup.userGroupId)) {
	    			userUserGroupsIds.push(assignedUserGroup.userGroupId);
	  			}
	    	});
	    	var sameUserGroupsUserIds = new Array();

	      // First push the users created by the logged in user, its invitees
	      Users.find({
	        createdBy: Meteor.user()._id,
	      }).forEach((invitee) => {
	        sameUserGroupsUserIds.push(invitee._id)
	      });

	      // Then push the users of the same user groups as of the logged in user
	    	AssignedUserGroups.find({
	    		userGroupId: { $in: userUserGroupsIds }
	    	}).forEach((assignedUserGroup) => {
	        // Filter out the userIds already pushed earlier
	  			if (!sameUserGroupsUserIds.includes(assignedUserGroup.userId)) {
	      		sameUserGroupsUserIds.push(assignedUserGroup.userId);
	  			}
	    	});

	      return Users.find({
	      	_id: { $in: sameUserGroupsUserIds },
	      	'emails.verified': true,
	        $nor: [
	          { isAdmin: true },
	          { roleId: role._id }
	        ]
	      });
	    }
	}
	
	if (!isAdmin && Meteor.user().roleName === 'Coach') {
		 const managerRole = Roles.findOne({name: 'Manager'});
	   const coachRole = Roles.findOne({name: 'Coach'});
	   if (managerRole && managerRole._id && coachRole && coachRole._id) {
	     const userId = Meteor.user()._id;
	     var userUserGroupsIds = new Array();
  		 AssignedUserGroups.find({userId}).forEach((assignedUserGroup) => {
  		  if (!userUserGroupsIds.includes(assignedUserGroup.userGroupId)) {
    	    userUserGroupsIds.push(assignedUserGroup.userGroupId);
  			}
    	 });
  		 
	    var sameUserGroupsUserIds = new Array();
	    
	    // First push the users created by the logged in user, its invitees
	    Users.find({
	      createdBy: Meteor.user()._id,
	    }).forEach((invitee) => {
	        sameUserGroupsUserIds.push(invitee._id)
	    });
	    
	    // Then push the users of the same user groups as of the logged in user
	   AssignedUserGroups.find({
	     userGroupId: { $in: userUserGroupsIds }
	   }).forEach((assignedUserGroup) => {
	   // Filter out the userIds already pushed earlier
	   if (!sameUserGroupsUserIds.includes(assignedUserGroup.userId)) {
	  	   sameUserGroupsUserIds.push(assignedUserGroup.userId);
	  	}
	  });
	   
	 return Users.find({
	  _id: { $in: sameUserGroupsUserIds },
	    'emails.verified': true,
	     $nor: [
	       { isAdmin: true },
	       { roleId: managerRole._id },
	       { roleId: coachRole._id }
	     ]
	 });
	}
 }
},
	tableSettings : function () {
    return {
        currentPage: Template.instance().currentPage,
        class : 'table table-striped table-hover',
        fields: [
          { key: 'username', label: TAPi18n.__('username') },
          { key: 'profile.fullname', label: TAPi18n.__('fullname')},
          { key: 'isAdmin',  label: TAPi18n.__('admin') , fn: function (isAdmin) { return isAdmin ? 'Yes' : 'No'; }},
          { key: 'roleName', label: TAPi18n.__('role')},
          { key: 'emails.0.address', label: TAPi18n.__('email')},
          { key: 'emails.0.verified', label: TAPi18n.__('verified'), fn: function(verified) {return verified ? 'Yes' : 'No'; } },
          { key: 'createdAt', 'label': TAPi18n.__('createdAt'), fn: function(createdAt) { return moment(createdAt).format('LLL'); }},
          { key: 'loginDisabled', 'label': TAPi18n.__('active'), fn: function(loginDisabled) { return loginDisabled ? 'No' : 'Yes'; }},
          { key: '_id', label: TAPi18n.__('user-groups'),
            fn: function (_id) { 
                var userGroupsIds = new Array();
                AssignedUserGroups.find({
                  userId: _id
                }).forEach((assignedUserGroup) => {
                  userGroupsIds.push(assignedUserGroup.userGroupId);
                });
                
                var html = '<ul>';
                UserGroups.find({ _id: { $in: userGroupsIds } }).
                           forEach((userGroup) => {
                             html += '<li>'+userGroup.title+'</li>';
                           });
                html += '</ul>';
                
                return new Spacebars.SafeString(html);
            }
          },
          { key: 'authenticationMethod', 'label': TAPi18n.__('authentication-method')},
          { key: '_id', 'label': TAPi18n.__('actions'), 
          	fn: function (_id) {
          		var html = "<a class='edit-user' data-id='"+_id+"' href='#'><i class='fa fa-edit'></i>Edit</a>  ";
          		if (Meteor.user().isAdmin) {
          			html += "<a class='more-settings' data-id='"+_id+"' href='#'><i class='fa fa-ellipsis-h'></i></a>";
          		}
          		return new Spacebars.SafeString(html);
          	} 
          },
          
        ]
    };
  },

});

Template.invitationsGeneral.helpers({
	 inviteesList() {
		  var sameUserGroupsUserIds = new Array();
		  const user = Users.find({
	      createdBy: Meteor.user()._id
	    }).forEach((invitee) => {
	      sameUserGroupsUserIds.push(invitee._id)
		  });
		  
		  return Users.find({'emails.verified':false,_id: { $in: sameUserGroupsUserIds }}, {sort :{ createdAt: -1 }});
	  },
	  
	  tableSettings: function() {
	  	return{
	  		id :'subscriptionsDataTable',
	  		fields:[
	  			{ key: 'username', label: TAPi18n.__('username') },
	  			{ key: 'profile.fullname', label: TAPi18n.__('fullname')},
	  			{ key: 'isAdmin',  label: TAPi18n.__('admin') , fn: function (isAdmin) { return isAdmin ? 'Yes' : 'No'; }},
          { key: 'roleName', label: TAPi18n.__('role') },
          { key: 'emails.0.address', label: TAPi18n.__('email')},
          { key: 'emails.0.verified', label: TAPi18n.__('verified'), fn: function(verified) {return verified ? 'Yes' : 'No'; } },
          { key: 'createdAt', label: TAPi18n.__('createdAt'), fn: function(createdAt) { return moment(createdAt).format('LLL'); }},
          { key: '_id', 'label': TAPi18n.__('actions'), 
          	fn: function (_id) {
          		var html = "<a class='edit-invitee renewSubscription' data-id='"+_id+"' href='#'>Edit</a>  ";
          			  html += "<a class='resend-invite upgradeSubscription' data-id='"+_id+"' href='#'>Resend Invitation</a>  ";
          			  html += "<a class='view-email archiveSubscription' data-id='"+_id+"' href='#'>View Email</a>";
          		return new Spacebars.SafeString(html);
          	},
          	cellClass: function(object, value) {
          		var css = 'subscriptionsActionCol';
          		return css;
          	}
          },
	  		]
	  	}
	  }
});
