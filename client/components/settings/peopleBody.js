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
    this.assignedUserGroups = new ReactiveVar(false);
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
  managerUsersList() {
    const role = Roles.findOne({name: 'Manager'});
    const users = Users.find({
      $nor: [
        { isAdmin: true },
        { roleId: role._id }
      ]
    });
    this.number.set(users.count());
    return users;
  },
  coachUsersList() {
    const managerRole = Roles.findOne({name: 'Manager'});
    const coachRole = Roles.findOne({name: 'Coach'});
    if (managerRole && managerRole._id && coachRole && coachRole._id) {
      const users = Users.find({
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
      this.assignedUserGroups.set('assigned-user-groups-setting' === targetID);
    }
  },
  events() {
    return [{
      'click a.js-setting-menu': this.switchMenu,
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
          buttons: true,
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
	   'click a.edit-user-group': Popup.open('editUserGroup'),
	  }];
	}
}).register('userGroupRow');

Template.userGroupRow.helpers({
	userGroupData() {
    return UserGroups.findOne(this.userGroupId);
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
      submit(evt) {
        evt.preventDefault();
        const userGroupId = Template.instance().data.userGroupId;
        const title = this.find('.js-user-group-title').value.trim();
        const boardsQuota = this.find('.js-user-group-boards-quota').value.trim();
        const usersQuota = this.find('.js-user-group-users-quota').value.trim();

        var leftBlank = ['undefined', null, ''];
        var titleLeftBlank = leftBlank.indexOf(title) > -1;
        var boardsQuotaLeftBlank = leftBlank.indexOf(boardsQuota) > -1;
        var usersQuotaLeftBlank = leftBlank.indexOf(usersQuota) > -1;
        $('.user-group-not-edited').hide();
        if (titleLeftBlank) {
        	this.$('.title-blank').show();
        }
        const duplicateTitle = UserGroups.findOne({
        	title,
        	_id: { $ne: userGroupId }
      	});
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

        UserGroups.update(
      		{ _id: userGroupId }, 
      		{ $set: { title, boardsQuota, usersQuota } }, 
      		(err, res) => {
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
	          	var message = TAPi18n.__('user-group-edited');
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

      'click #deleteButton'() {
        const userGroupId = Template.instance().data.userGroupId;
        Popup.close();
        swal({
          title: 'Confirm Delete User-Group!',
          text: 'Are you sure?',
          icon: "warning",
          buttons: true,
          dangerMode: true,
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
            	}
            });
          } else {
            return false;
          }
        });
      },
    }];
  },
}).register('editUserGroupPopup');

Template.editUserGroupPopup.helpers({
	userGroup() {
    return UserGroups.findOne(this.userGroupId);
  },

  notAsssignedToAnyUser() {
  	const assignedGroup = AssignedUserGroups.findOne({userGroupId: this.userGroupId});
  	if (!assignedGroup) {
  		return true;
  	} else {
    	return false;
  	}
  },
});

BlazeComponent.extendComponent({
	assignedUserGroupsList() {
  	return AssignedUserGroups.find();
  },
  events() {
	  return [{
	    'click button#assign-user-to-user-group': Popup.open('assignUserToUserGroup'),
	  }];
	}
}).register('assignedUserGroupsGeneral');

BlazeComponent.extendComponent({
  events() {
	  return [{
	   'click a.edit-assigned-user-group': Popup.open('editAssignedUserGroup'),
	  }];
	}
}).register('assignedUserGroupRow');

Template.assignedUserGroupRow.helpers({
	assignedUserGroupData() {
    const data = AssignedUserGroups.findOne(this.assignedUserGroupId);
    if (data && data._id) {
    	const user = Users.findOne({_id: data.userId});
    	if (user && user._id) {
        data.username = user.username;
        if (user.emails && user.emails[0] && user.emails[0].address) {
          data.email = user.emails[0].address;
        }
    	}
    	const userGroup = UserGroups.findOne({_id: data.userGroupId});
    	if (userGroup && userGroup._id) {
        data.userGroupTitle = userGroup.title;
    	}
    }
    return data;
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

  users() {
    return Users.find();
  },
  
  events() {
    return [{
      'change .js-select-user'() {
      	//First remove the UserGroups List options and set the GroupOrder to 1
      	$('.js-select-user-group').html("<option value='' selected='selected'>Select One</option>");
      	$('.js-group-order').val(1);
      	
      	// Then find the selected user and the UserGroups he is assigned to.
      	// Return all the UserGroups excluding the ones the selected user is already assigned to.
      	const userId = this.find('.js-select-user option:selected').value;
      	const user = Users.findOne({_id: userId});
      	if (user && user._id) {
        	const assignedUserGroups = AssignedUserGroups.find({userId: user._id});
        	if (assignedUserGroups) {
        		const groupsIds = new Array();
        		assignedUserGroups.forEach((assignedUserGroup) => {
        			groupsIds.push(assignedUserGroup.userGroupId);
        		});
        		const options = UserGroups.find({ _id: { $nin: groupsIds } });
        		options.forEach((option) => {
          		$('.select-user-group').append("<option value='"+ option._id +"'>"+ option.title +"</option>");
        		});

    				//	If the selected user has N number of UserGroups assigned to him, 
          	//  then the 'groupOrder' field should auto-generate the field with the number N+1.
          	$('.js-group-order').val(groupsIds.length + 1);
        	} else {
        		UserGroups.find().forEach((userGroup) => {
          		$('.select-user-group').append("<option value='"+ userGroup._id +"'>"+ userGroup.title +"</option>");
        		});
        	}
      	}
      },

    	submit(evt) {
        evt.preventDefault();
        const userId = this.find('.js-select-user').value;
        const userGroupId = this.find('.js-select-user-group').value;
        const groupOrder = this.find('.js-group-order').value.trim();

        var leftBlank = ['undefined', null, ''];
        var userNotSelected = leftBlank.indexOf(userId) > -1;
        var userGroupNotSelected = leftBlank.indexOf(userGroupId) > -1;
        var groupOrderLeftBlank = leftBlank.indexOf(groupOrder) > -1;
        $('assigned-user-group-not-created').hide();
        if (userNotSelected) {
        	this.$('.select-user-msg').show();
        }
        if (userGroupNotSelected) {
        	this.$('.select-user-group-msg').show();
        }
        if (groupOrderLeftBlank) {
        	this.$('.group-order-blank').show();
        }
        if (userNotSelected || userGroupNotSelected || groupOrderLeftBlank) {
          return false;
        }
        this.setLoading(true);

        AssignedUserGroups.insert({ 
        	userId, userGroupId, groupOrder
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
	          	var message = TAPi18n.__('assigned-user-to-user-group');
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

      'click #cancelAssignedUserGroupCreation'() {
        Popup.close();
      },
    }];
  },
}).register('assignUserToUserGroupPopup');

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

  userGroups() {
    return UserGroups.find();
  },

  events() {
    return [{
      'change .js-select-user'() {
      	//First remove the UserGroups List options and set the GroupOrder to 1
      	$('.js-select-user-group').html("<option value='' selected='selected'>Select One</option>");
      	$('.js-group-order').val(1);
      	
      	// Then find the selected user and the UserGroups he is assigned to.
      	// Return all the UserGroups excluding the ones the selected user is already assigned to.
      	const userId = this.find('.js-select-user option:selected').value;
      	const user = Users.findOne({_id: userId});
      	if (user && user._id) {
        	const assignedUserGroups = AssignedUserGroups.find({userId: user._id});
        	if (assignedUserGroups) {
        		const groupsIds = new Array();
        		assignedUserGroups.forEach((assignedUserGroup) => {
        			groupsIds.push(assignedUserGroup.userGroupId);
        		});
        		const options = UserGroups.find({ _id: { $nin: groupsIds } });
        		options.forEach((option) => {
          		$('.select-user-group').append("<option value='"+ option._id +"'>"+ option.title +"</option>");
        		});

    				//	If the selected user has N number of UserGroups assigned to him, 
          	//  then the 'groupOrder' field should auto-generate the field with the number N+1.
          	$('.js-group-order').val(groupsIds.length + 1);
        	} else {
        		UserGroups.find().forEach((userGroup) => {
          		$('.select-user-group').append("<option value='"+ userGroup._id +"'>"+ userGroup.title +"</option>");
        		});
        	}
      	}
      },

    	submit(evt) {
        evt.preventDefault();
        const assignedUserGroupId = Template.instance().data.assignedUserGroupId;
        const userId = this.find('.js-select-user').value;
        const userGroupId = this.find('.js-select-user-group').value;
        const groupOrder = this.find('.js-group-order').value.trim();

        var leftBlank = ['undefined', null, ''];
        var userNotSelected = leftBlank.indexOf(userId) > -1;
        var userGroupNotSelected = leftBlank.indexOf(userGroupId) > -1;
        var groupOrderLeftBlank = leftBlank.indexOf(groupOrder) > -1;
        $('assigned-user-group-not-edited').hide();
        if (userNotSelected) {
        	this.$('.select-user-msg').show();
        }
        if (userGroupNotSelected) {
        	this.$('.select-user-group-msg').show();
        }
        if (groupOrderLeftBlank) {
        	this.$('.group-order-blank').show();
        }
        if (userNotSelected || userGroupNotSelected || groupOrderLeftBlank) {
          return false;
        }
        this.setLoading(true);

        AssignedUserGroups.update(
      		{ _id: assignedUserGroupId }, 
      		{ $set: { userId, userGroupId, groupOrder } }, 
      		(err, res) => {
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
	          	var message = TAPi18n.__('assigned-user-group-edited');
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

      'click #deleteButton'() {
        const assignedUserGroupId = Template.instance().data.assignedUserGroupId;
        Popup.close();
        swal({
          title: 'Delete Assigned-User-Group?',
          text: 'Are you sure?',
          icon: "warning",
          buttons: true,
          dangerMode: true,
        })
        .then((okDelete) => {
          if (okDelete) {
          	AssignedUserGroups.remove({_id: assignedUserGroupId}, (err, res) => {
            	if (err) {
            		swal(err, {
                  icon: "success",
                });
            	} else if (res) {
            		swal("Assigned-User-Group has been deleted!", {
                  icon: "success",
                });
            	}
            });
          } else {
            return false;
          }
        });
      },
    }];
  },
}).register('editAssignedUserGroupPopup');

Template.editAssignedUserGroupPopup.helpers({
  specificRowUser(match) {
    const assignedUserGroupId = Template.instance().data.assignedUserGroupId;
    if (assignedUserGroupId) {
      const selected = AssignedUserGroups.findOne(assignedUserGroupId).userId;
      return selected === match;
    }
    return false;
  },

  specificRowUserGroup(match) {
    const assignedUserGroupId = Template.instance().data.assignedUserGroupId;
    if (assignedUserGroupId) {
      const selected = AssignedUserGroups.findOne(assignedUserGroupId).userGroupId;
      return selected === match;
    }
    return false;
  },
  
	assignedUserGroup() {
    return AssignedUserGroups.findOne(this.assignedUserGroupId);
  },
});
