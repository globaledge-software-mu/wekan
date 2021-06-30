BlazeComponent.extendComponent({
  onCreated() {
    this.error = new ReactiveVar('');
    this.loading = new ReactiveVar(false);
    this.generalSetting = new ReactiveVar(true);
    this.emailSetting = new ReactiveVar(false);
    this.accountSetting = new ReactiveVar(false);
    this.announcementSetting = new ReactiveVar(false);
    this.layoutSetting = new ReactiveVar(false);
    this.batchSetting = new ReactiveVar(false);

    Meteor.subscribe('setting');
    Meteor.subscribe('mailServer');
    Meteor.subscribe('accountSettings');
    Meteor.subscribe('announcements');
    Meteor.subscribe('folders');
  },

  setError(error) {
    this.error.set(error);
  },

  setLoading(w) {
    this.loading.set(w);
  },

  checkField(selector) {
    const value = $(selector).val();
    if (!value || value.trim() === '') {
      $(selector).parents('li.smtp-form').addClass('has-error');
      throw Error('blank field');
    } else {
      return value;
    }
  },

  currentSetting() {
    return Settings.findOne();
  },

  // return user's every owned (is admin of) and active (not archived) boards
  ownBoards() {
    return Boards.find({
      archived: false,
      members: {
        $elemMatch: {
          userId: Meteor.userId(),
          isAdmin: true
        }
      },
      type: {$ne: 'template-container'}
    }, {
      sort: ['title'],
    });
  },

  folders() {
    return Folders.find({
      userId: Meteor.user()._id,
      contents: { $exists: true }
    }, {
      sort: ['name']
    }
    );
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

  toggleRegistration() {
    this.setLoading(true);
    const registrationClosed = this.currentSetting().disableRegistration;
    Settings.update(Settings.findOne()._id, {$set: {disableRegistration: !registrationClosed}});
    this.setLoading(false);
    if (registrationClosed) {
      $('.invite-people').slideUp();
    } else {
      $('.invite-people').slideDown();
    }
  },
  toggleTLS() {
    $('#mail-server-tls').toggleClass('is-checked');
  },
  toggleHideLogo() {
    $('#hide-logo').toggleClass('is-checked');
  },
  toggleDisplayAuthenticationMethod() {
    $('#display-authentication-method').toggleClass('is-checked');
  },
  switchMenu(event) {
    const target = $(event.target);
    if (!target.hasClass('active')) {
      $('.side-menu li.active').removeClass('active');
      target.parent().addClass('active');
      const targetID = target.data('id');
      this.generalSetting.set('registration-setting' === targetID);
      this.emailSetting.set('email-setting' === targetID);
      this.accountSetting.set('account-setting' === targetID);
      this.announcementSetting.set('announcement-setting' === targetID);
      this.layoutSetting.set('layout-setting' === targetID);
      this.batchSetting.set('batch-invitation' === targetID);
      console.log(this.batchSetting.get());
    }
  },

  checkBoard(event) {
    let target = $(event.target);
    if (!target.hasClass('js-toggle-board-choose')) {
      target = target.parent();
    }
    const checkboxId = target.attr('id');
    $(`#${checkboxId} .materialCheckBox`).toggleClass('is-checked');
    $(`#${checkboxId}`).toggleClass('is-checked');
  },

  inviteThroughEmail() {
    const emails = $('#email-to-invite').val().toLowerCase().trim().split('\n').join(',').split(',');
    var selectedUserGroupId = '';
    if ($('.choose-specific-quota-to-use').length > 0 && $('.choose-specific-quota-to-use option:selected').length > 0) {
      selectedUserGroupId = $('.choose-specific-quota-to-use option:selected').val();
    }
    const boardsToInvite = [];
    $('.js-toggle-board-choose .materialCheckBox.is-checked').each(function () {
      boardsToInvite.push($(this).data('id'));
    });
    const validEmails = [];
    emails.forEach((email) => {
      if (email && SimpleSchema.RegEx.Email.test(email.trim())) {
        validEmails.push(email.trim());
      }
    });
    const roleId = $('.js-profile-role').children("option:selected").val();
  	const roleName = null;
    const role = Roles.findOne({_id: roleId});
    if (role && role.name) {
    	roleName = role.name;
    }
    if (validEmails.length) {
      this.setLoading(true);
      // Call method to Invite User(s) to Board(s)
//      Meteor.call('sendInvitation', validEmails, boardsToInvite, () => {
//        // if (!err) {
//        //   TODO - show more info to user
//        // }
//        this.setLoading(false);
//      });

      // Added the following logic to call the 'inviteUserToBoard' method from the model 'Users'
      // so that the system creates the user record and then an email to the user to complete its registration by just entering his password
      const self = this;

      validEmails.forEach((validEmail) => {
      	boardsToInvite.forEach((inviteToBoard) => {
          Meteor.call('inviteUserToBoard', validEmail, inviteToBoard, roleId, selectedUserGroupId, (err, ret) => {
            self.setLoading(false);
            if (err) {
            	var message = '';
            	if (err.error) {
              	message = TAPi18n.__(err.error);
            	} else {
              	message = TAPi18n.__(err);
              	if (message == null || message == '' || typeof message === 'undefined' || message.length < 1) {
              		message = err;
              		if (typeof err === 'object') {
              			message = JSON.stringify(err);
              		}
              	}
            	}
              var $errorMessage = $('<div class="errorStatus inviteNotSent"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
              $('#header-main-bar').before($errorMessage);
              $errorMessage.delay(10000).slideUp(500, function() {
                $(this).remove();
              });
            } else if (ret.email) {
              Users.update(
            		{ _id: ret.userID },
            		{ $set:
            			{ 'roleId': roleId, 'roleName': roleName },
            		}
          		);

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
            }
          });
      	});
      });
    }
  },

  saveMailServerInfo() {
    this.setLoading(true);
    $('li').removeClass('has-error');

    try {
      const host = this.checkField('#mail-server-host');
      const port = this.checkField('#mail-server-port');
      const username = $('#mail-server-username').val().trim();
      const password = $('#mail-server-password').val().trim();
      const from = this.checkField('#mail-server-from');
      const tls = $('#mail-server-tls.is-checked').length > 0;
      Settings.update(Settings.findOne()._id, {
        $set: {
          'mailServer.host': host, 'mailServer.port': port, 'mailServer.username': username,
          'mailServer.password': password, 'mailServer.enableTLS': tls, 'mailServer.from': from,
        },
      });
    } catch (e) {
      return;
    } finally {
      this.setLoading(false);
    }

  },

  saveLayout() {
    this.setLoading(true);
    $('li').removeClass('has-error');

    const productName = $('#product-name').val().trim();
    const hideLogoChange = ($('input[name=hideLogo]:checked').val() === 'true');
    const displayAuthenticationMethod = ($('input[name=displayAuthenticationMethod]:checked').val() === 'true');
    const defaultAuthenticationMethod = $('#defaultAuthenticationMethod').val();
    const customHTMLafterBodyStart = $('#customHTMLafterBodyStart').val().trim();
    const customHTMLbeforeBodyEnd = $('#customHTMLbeforeBodyEnd').val().trim();

    try {
      Settings.update(Settings.findOne()._id, {
        $set: {
          productName,
          hideLogo: hideLogoChange,
          customHTMLafterBodyStart,
          customHTMLbeforeBodyEnd,
          displayAuthenticationMethod,
          defaultAuthenticationMethod,
        },
      });
    } catch (e) {
      return;
    } finally {
      this.setLoading(false);
    }

    DocHead.setTitle(productName);

  },

  sendSMTPTestEmail() {
    Meteor.call('sendSMTPTestEmail', (err, ret) => {
      if (!err && ret) {
        const message = `${TAPi18n.__(ret.message)}: ${ret.email}`;
        alert(message);
      } else {
        const reason = err.reason || '';
        const message = `${TAPi18n.__(err.error)}\n${reason}`;
        alert(message);
      }
    });
  },

  events() {
    return [{
      'click a.js-toggle-registration': this.toggleRegistration,
      'click a.js-toggle-tls': this.toggleTLS,
      'click a.js-setting-menu': this.switchMenu,
      'click a.js-toggle-board-choose': this.checkBoard,
      'change select#generateSpecificList'(evt) {
        const optionSelected = $(evt.target).val();

        if (optionSelected.length > 0) {
          if (optionSelected === 'own') {
            // List user's every owned (is admin of) and active (not archived) boards
            $('.scrollableBoardsList').empty();
            Boards.find({
              archived: false,
              members: {
                $elemMatch: {
                  userId: Meteor.userId(),
                  isAdmin: true
                }
              },
              type: {$ne: 'template-container'}
            }, {
              sort: ['title'],
            }).forEach((board) => {
              $('.scrollableBoardsList').append(
                '<a class="option flex js-toggle-board-choose" id="'+board._id+'" href="#">'+
                '<div class="materialCheckBox" data-id="'+board._id+'"></div>'+
                '<span>'+board.title+'</span>'+
                '</a>'
              );
            });
          } else if (optionSelected === 'templates') {
            // List template boards of which the user is a member of
            $('.scrollableBoardsList').empty();
            Boards.find({
              archived: false,
              'members.userId': Meteor.userId(),
              type: 'template-board',
            }, {
              sort: ['title'],
            }).forEach((board) => {
              $('.scrollableBoardsList').append(
                '<a class="option flex js-toggle-board-choose" id="'+board._id+'" href="#">'+
                '<div class="materialCheckBox" data-id="'+board._id+'"></div>'+
                '<span>'+board.title+'</span>'+
                '</a>'
              );
            });
          } else if (optionSelected === 'uncategorised') {
            // List user's uncategorised boards
            $('.scrollableBoardsList').empty();

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

            Boards.find({
              _id: { $nin: categorisedBoardIds },
              archived: false,
              'members.userId': Meteor.userId(),
              type: {
                $nin: [ 'template-board', 'template-container' ]
              },
            }, {
              sort: ['title'],
            }).forEach((board) => {
            $('.scrollableBoardsList').append(
                '<a class="option flex js-toggle-board-choose" id="'+board._id+'" href="#">'+
                '<div class="materialCheckBox" data-id="'+board._id+'"></div>'+
                '<span>'+board.title+'</span>'+
                '</a>'
              );
            });
          } else {
            // get the user's categorised boards, more specifically, the ones from the user's folder which was selected
            $('.scrollableBoardsList').empty();
            const folderId = optionSelected;
            const folder = Folders.findOne({ _id: folderId });
            if (folder && folder._id) {
              var boardIds = new Array;

              var folderContents = folder.contents;
              if (typeof(folderContents) != 'undefined' && folderContents !== null && _.keys(folderContents).length > 0) {
                for (var j=0; j < _.keys(folderContents).length; j++) {
                  boardIds.push(folderContents[j].boardId);
                }
              }

              Boards.find({
                _id: { $in: boardIds },
                archived: false,
                'members.userId': Meteor.userId(),
                type: {
                  $nin: [ 'template-board', 'template-container' ]
                },
              }, {
                sort: ['title'],
              }).forEach((board) => {
              $('.scrollableBoardsList').append(
                  '<a class="option flex js-toggle-board-choose" id="'+board._id+'" href="#">'+
                  '<div class="materialCheckBox" data-id="'+board._id+'"></div>'+
                  '<span>'+board.title+'</span>'+
                  '</a>'
                );
              });
            }
          }
        }
      },
      'click button.js-email-invite'(evt) {
        evt.preventDefault();
      	$('.successStatus.inviteSent').remove();
      	$('.errorStatus.inviteNotSent').remove();
      	$('.select-role-msg').hide();
      	$('.select-board-msg').hide();
      	$('.enter-valid-email').hide();
        const emails = $('#email-to-invite').val().toLowerCase().trim().split('\n').join(',').split(',');
        const validEmails = [];
        emails.forEach((email) => {
          if (email && SimpleSchema.RegEx.Email.test(email.trim())) {
            validEmails.push(email.trim());
          }
        });
        var validEmailNotEntered = !validEmails.length;
      	var roleNotSelected = $('.select-role.js-profile-role option:selected').html() === 'Select One';
      	var boardNotSelected = !$('.materialCheckBox.is-checked').length;
      	if (validEmailNotEntered && !boardNotSelected && !roleNotSelected) {
        	$('.enter-valid-email').show();
        	$('html, body, .main-body').animate({scrollTop: '0px'}, 300);
        } else if (!validEmailNotEntered && !boardNotSelected && roleNotSelected) {
        	$('.select-role-msg').show();
        } else if (!validEmailNotEntered && boardNotSelected && !roleNotSelected) {
        	$('.select-board-msg').show();
        	$('html, body, .main-body').animate({scrollTop: '0px'}, 300);
        } else if (validEmailNotEntered && !boardNotSelected && roleNotSelected) {
        	$('.enter-valid-email').show();
        	$('.select-role-msg').show();
        	$('html, body, .main-body').animate({scrollTop: '0px'}, 300);
        } else if (validEmailNotEntered && boardNotSelected && !roleNotSelected) {
        	$('.enter-valid-email').show();
        	$('.select-board-msg').show();
        	$('html, body, .main-body').animate({scrollTop: '0px'}, 300);
        } else if (!validEmailNotEntered && boardNotSelected && roleNotSelected) {
        	$('.select-role-msg').show();
        	$('.select-board-msg').show();
        	$('html, body, .main-body').animate({scrollTop: '0px'}, 300);
        } else if (validEmailNotEntered && boardNotSelected && roleNotSelected) {
        	$('.select-role-msg').show();
        	$('.select-board-msg').show();
        	$('.enter-valid-email').show();
        	$('html, body, .main-body').animate({scrollTop: '0px'}, 300);
        } else {
          this.inviteThroughEmail();
        }
      },
      'click button.js-save': this.saveMailServerInfo,
      'click button.js-send-smtp-test-email': this.sendSMTPTestEmail,
      'click a.js-toggle-hide-logo': this.toggleHideLogo,
      'click button.js-save-layout': this.saveLayout,
      'click a.js-toggle-display-authentication-method': this.toggleDisplayAuthenticationMethod,
    }];
  },
}).register('setting');

BlazeComponent.extendComponent({

  saveAccountsChange() {
    const allowEmailChange = ($('input[name=allowEmailChange]:checked').val() === 'true');
    const allowUserNameChange = ($('input[name=allowUserNameChange]:checked').val() === 'true');
    AccountSettings.update('accounts-allowEmailChange', {
      $set: {'booleanValue': allowEmailChange},
    });
    AccountSettings.update('accounts-allowUserNameChange', {
      $set: {'booleanValue': allowUserNameChange},
    });
  },

  allowEmailChange() {
    return AccountSettings.findOne('accounts-allowEmailChange').booleanValue;
  },
  allowUserNameChange() {
    return AccountSettings.findOne('accounts-allowUserNameChange').booleanValue;
  },

  events() {
    return [{
      'click button.js-accounts-save': this.saveAccountsChange,
    }];
  },
}).register('accountSettings');

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },

  setLoading(w) {
    this.loading.set(w);
  },

  currentSetting() {
    return Announcements.findOne();
  },

  saveMessage() {
    const message = $('#admin-announcement').val().trim();
    Announcements.update(Announcements.findOne()._id, {
      $set: {'body': message},
    });
  },

  toggleActive() {
    this.setLoading(true);
    const isActive = this.currentSetting().enabled;
    Announcements.update(Announcements.findOne()._id, {
      $set: {'enabled': !isActive},
    });
    this.setLoading(false);
    if (isActive) {
      $('.admin-announcement').slideUp();
    } else {
      $('.admin-announcement').slideDown();
    }
  },

  events() {
    return [{
      'click a.js-toggle-activemessage': this.toggleActive,
      'click button.js-announcement-save': this.saveMessage,
    }];
  },
}).register('announcementSettings');


Template.selectAuthenticationMethod.onCreated(function() {
  this.authenticationMethods = new ReactiveVar([]);

  Meteor.call('getAuthenticationsEnabled', (_, result) => {
    if (result) {
      // TODO : add a management of different languages
      // (ex {value: ldap, text: TAPi18n.__('ldap', {}, T9n.getLanguage() || 'en')})
      this.authenticationMethods.set([
        {value: 'password'},
        // Gets only the authentication methods availables
        ...Object.entries(result).filter((e) => e[1]).map((e) => ({value: e[0]})),
      ]);
    }
  });
});

Template.selectAuthenticationMethod.helpers({
  authentications() {
    return Template.instance().authenticationMethods.get();
  },
  isSelected(match) {
    return Template.instance().data.authenticationMethod === match;
  },
});

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },
  onRendered() {
  	 const cloneEle = $('.form-fields').clone();
  	 
     for (var i = 0; i < 9; i++) {
    	 cloneEle.clone().insertAfter('.form-fields:last');
     }
     
     $('.form-fields').each(function(index,value) {
    	 var dataId= index+1;
       $(value).attr('data-id', dataId);
       $(value).find('li#emailAddress').attr('data-id', dataId);
       $(value).find('li#firstName').attr('data-id', dataId);
       $(value).find('li#lastName').attr('data-id', dataId);
       //$(value).find('li .enter-valid-input').attr('data-id', dataId);
     });
  },
  setLoading(w) {
    this.loading.set(w);
  },
  roles() {
    return Roles.find({});
  },
  
  boards() {
    return Boards.find({
      archived: false,
      members: {
        $elemMatch: {
          userId: Meteor.userId(),
          isAdmin: true
        }
      },
      type: {$ne: 'template-container'}
    }, {
      sort: ['title'],
    });
  },
  folders() {
  	return Folders.find({ userId: Meteor.userId() });
  },
  
  events() {
  	return [{
     'click .js-invite-batch'(evt) {
    	 var batchData = [];
    	 var isValid = true;
    	 var errors = [];
    	 
    	 
    	  const title = 'test'; ;
		    var selectedUserGroupId = '';
		    if ($('.choose-specific-quota-to-use option:selected')) {
		      selectedUserGroupId = this.find('.choose-specific-quota-to-use option:selected').value;
		    }
		    
    	 $('.form-fields').each(function(index, value) {
    		 const emailAddress =  $(this).find('input[name="emailAddress"]').val();
    		 const firstName = $(this).find('input[name="firstName"]').val();
  	     const lastName = $(this).find('input[name="lastName"]').val();
    		 //validation
    		 if ($(this).find('input[name="emailAddress"]').val() !='' &&  
    				 !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(emailAddress))
    		  {
    			  alert('Enter valid email');
    		    return false;
    		  }
    		  
    		  if ($(this).find('input[name="emailAddress"]').val() !='' &&  
     				 /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(emailAddress)) {
    		  	  batchData.push({
    		  	  emailAddress: emailAddress,
              firstName: firstName,
              lastName: lastName
              
            })
    		  }
    	   
    	 });
    	 /*if (errors.length > 0 ) {
    		 $('.errors').show();
    		 return false;
    	 }*/
    	 
       if (batchData.length > 0) {
      	 const visibility = 'private';
			   var boardId = '';
    		 for (var i = 0; i < batchData.length;i++) {
 		       if (selectedUserGroupId.length > 0) {
 		         boardId = Boards.insert({ title, permission: visibility, quotaGroupId: selectedUserGroupId });
 		       } else {
 		         boardId = Boards.insert({ title, permission: visibility });
 		       }
 		       
    	     Meteor.call('batchInviteUsers', batchData[i],boardId, function(err, success) {
    				 if (err) {
    					 throw new Meteor.Error('email-fail', err.message);
    				 }
    			   
    			 });
    		 }
    	 }
  	  }
   }];
  }
}).register('batchInvitation');

Template.batchInvitation.helpers({
  
});