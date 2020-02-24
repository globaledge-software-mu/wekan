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
    this.number = new ReactiveVar(0);

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
  events() {
    return [{
      'click #searchButton'() {
        this.filterPeople();
      },
      'keydown #searchInput'(event) {
        if (event.keyCode === 13 && !event.shiftKey) {
          this.filterPeople();
        }
      },
    }];
  },
  filterPeople() {
    const value = $('#searchInput').first().val();
    if (value === '') {
      this.findUsersOptions.set({});
    } else {
      const regex = new RegExp(value, 'i');
      this.findUsersOptions.set({
        $or: [
          { username: regex },
          { 'profile.fullname': regex },
          { 'emails.address': regex },
        ],
      });
    }
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
    const users = Users.find();
    this.number.set(users.count());
    return users;
  },
  managerUserGroupsUsersList() {
    const role = Roles.findOne({name: 'Manager'});
    if (role && role._id) {
    	const userId = Meteor.user()._id;
    	const userUserGroupsIds = new Array();
  		AssignedUserGroups.find({userId}).forEach((assignedUserGroup) => {
  			if (!userUserGroupsIds.includes(assignedUserGroup.userGroupId)) {
    			userUserGroupsIds.push(assignedUserGroup.userGroupId);
  			}
    	});
    	const sameUserGroupsUserIds = new Array();
    	AssignedUserGroups.find({
    		userGroupId: { $in: userUserGroupsIds }
    	}).forEach((assignedUserGroup) => {
  			if (!sameUserGroupsUserIds.includes(assignedUserGroup.userId)) {
      		sameUserGroupsUserIds.push(assignedUserGroup.userId);
  			}
    	});
      const users = Users.find({
      	_id: { $in: sameUserGroupsUserIds },
        $nor: [
          { isAdmin: true },
          { roleId: role._id }
        ]
      });
    	this.number.set(users.count());
      return users;
    } else {
      this.number.set(0);
      return null;
    }
  },
  coachUserGroupsUsersList() {
    const managerRole = Roles.findOne({name: 'Manager'});
    const coachRole = Roles.findOne({name: 'Coach'});
    if (managerRole && managerRole._id && coachRole && coachRole._id) {
    	const userId = Meteor.user()._id;
    	const userUserGroupsIds = new Array();
  		AssignedUserGroups.find({userId}).forEach((assignedUserGroup) => {
  			if (!userUserGroupsIds.includes(assignedUserGroup.userGroupId)) {
    			userUserGroupsIds.push(assignedUserGroup.userGroupId);
  			}
    	});
    	const sameUserGroupsUserIds = new Array();
    	AssignedUserGroups.find({
    		userGroupId: { $in: userUserGroupsIds }
    	}).forEach((assignedUserGroup) => {
  			if (!sameUserGroupsUserIds.includes(assignedUserGroup.userId)) {
      		sameUserGroupsUserIds.push(assignedUserGroup.userId);
  			}
    	});
      const users = Users.find({
      	_id: { $in: sameUserGroupsUserIds },
        $nor: [
          { isAdmin: true },
          { roleId: managerRole._id },
          { roleId: coachRole._id }
        ]
      });
      this.number.set(users.count());
      return users;
    } else {
      this.number.set(0);
      return null;
    }
  },
  peopleNumber() {
    return this.number.get();
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
    }
  },
  events() {
    return [{
      'click a.js-setting-menu'(e) {
      	Popup.close();
      	this.switchMenu(e);
      },
      'click #create-user': Popup.open('createNewUser'),
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
        const quotaGroupId = this.find('.choose-specific-quota-to-use option:selected').value.trim();
        const isAdmin = false;
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

Template.peopleRow.helpers({
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
  }
});

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
        const user_id = Template.instance().data.userId;
        const user = Users.findOne(user_id);
        const fullname = this.find('.js-profile-fullname').value.trim();
        const username = this.find('.js-profile-username').value.trim();
        const password = this.find('.js-profile-password').value;
        const isAdmin = this.find('.js-profile-isadmin').value.trim();
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
            	'members.userId': toBeDeletedUserId,
            	'members.isAdmin': true,
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

Template.editUserPopup.helpers({
	user() {
	  return Users.findOne(this.userId);
	},

	isSelected(match) {
	  const userId = Template.instance().data.userId;
	  const selected = Users.findOne(userId).authenticationMethod;
	  return selected === match;
	},

	isLdap() {
	  const userId = Template.instance().data.userId;
	  const selected = Users.findOne(userId).authenticationMethod;
	  return selected === 'ldap';
	},
});

Template.roleOptions.helpers({
  currentRole(match) {
    const userId = Template.instance().data.userId;
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
  userGroupsList() {
  	return UserGroups.find();
  },
  events() {
	  return [{
	    'click button#create-user-group': Popup.open('createUserGroup'),
	  }];
	}
}).register('userGroupsGeneral');

BlazeComponent.extendComponent({
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
});

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
    	'change #js-select-user'(evt) {
        // clearing any immediate previous response
        if ($('.errorResponse').length > 0 || $('.successResponse').length > 0) {
        	$('a#manageUserGroupResponse').empty();
        }

    		const userGroupId = $('#userGroupTitle').data('user-group-id');
    		const selectedUserId = $("#js-select-user option:selected").val();
    		var groupOrder = 1;
    		const assignedUserGroups = AssignedUserGroups.find({ userId: selectedUserId, userGroupId }, {$sort: {groupOrder: -1}});
    		if (assignedUserGroups && assignedUserGroups.count() > 0)  {
    			groupOrder = assignedUserGroups[0].groupOrder + 1;
    		}
    		AssignedUserGroups.insert({
    			userId: selectedUserId,
    			userGroupId,
    			groupOrder,
    		}, (err, res) => {
        	this.setLoading(false);
          if (err) {
          	var message = '';
          	if (err.error) {
            	message = TAPi18n.__(err.error);
          	} else {
          		message = err;
          	}
            $('a#manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse errorResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="errorResponse"><b>'+message+'</b></p>');
            $('a#manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
              $(this).remove();
            });
          } else if (res) {
          	var message = TAPi18n.__('added-member-successfully');
            $('a#manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse successResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="successResponse"><b>'+message+'</b></p>');
            $('a#manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
              $(this).remove();
            });
          }
        });
    	},

    	'change #js-select-group-admin'(evt) {
        // clearing any immediate previous response
        if ($('.errorResponse').length > 0 || $('.successResponse').length > 0) {
        	$('a#manageUserGroupResponse').empty();
        }
    		const userGroupId = $('#userGroupTitle').data('user-group-id');
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
  	            $('a#manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse errorResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="errorResponse"><b>'+message+'</b></p>');
  	            $('a#manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
  	              $(this).remove();
  	            });
  	          } else if (res) {
  	          	var message = TAPi18n.__('group-admin-set-successfully');
  	            $('a#manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse successResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="successResponse"><b>'+message+'</b></p>');
  	            $('a#manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
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
        	$('a#manageUserGroupResponse').empty();
        }
    		const userGroupId = $('#userGroupTitle').data('user-group-id');
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
  	            $('a#manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse errorResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="errorResponse"><b>'+message+'</b></p>');
  	            $('a#manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
  	              $(this).remove();
  	            });
  	          } else if (res) {
  	          	var message = TAPi18n.__('group-admin-unset-successfully');
  	            $('a#manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse successResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="successResponse"><b>'+message+'</b></p>');
  	            $('a#manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
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
        		const userGroupId = $('#userGroupTitle').data('user-group-id');
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
        	$('a#manageUserGroupResponse').empty();
        }

        const userGroupId = $('#userGroupTitle').data('user-group-id');
        const title = $('#userGroupTitle').data('user-group-title');
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
	            $('a#manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse errorResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="errorResponse"><b>'+message+'</b></p>');
	            $('a#manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
	              $(this).remove();
	            });
	          } else if (res) {
	          	var message = TAPi18n.__('user-group-edited');
	            $('a#manageUserGroupResponse').append('<a href="#" class="pull-right closeResponse successResponse" data-dismiss="alert" aria-label="close">&times;</a><p class="successResponse"><b>'+message+'</b></p>');
	            $('a#manageUserGroupResponse a,p').delay(10000).slideUp(500, function() {
	              $(this).remove();
	            });
	          }
	        }
    		);
      },

      'click #deleteUGButton'() {
        const userGroupId = $('#userGroupTitle').data('user-group-id');
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
    }];
  },
}).register('editUserGroup');

Template.editUserGroup.helpers({
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

  userGroupAdmins() {
		const groupId = Session.get('manageUserGroupId');
		const userGroupAdminIds = new Array();
	  AssignedUserGroups.find({ userGroupId: groupId, groupAdmin: {$in: ['Yes', 'yes']} }).forEach((assignedUGAdmin) => {
	  	userGroupAdminIds.push(assignedUGAdmin.userId);
	  });
	  return Users.find({ _id: {$in: userGroupAdminIds} });
  },
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
		return Subscriptions.find();
  },
}).register('subscriptionsGeneral');

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
    }
    return subscription;
  },
});

