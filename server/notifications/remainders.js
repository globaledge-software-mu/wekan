if (Meteor.isServer) {
  SyncedCron.add({
	  name: 'send-remainders-users',
	  schedule: function(parser) {
	    return parser.text('at 5:10 pm');
	  },
	  job: function() {
	    Users.find({
	      'profile.invitedBoards': {$exists:true, $not: {$size: 0}},
	      'emails.verified':true
	    }).forEach((user) => {
	    	//if user already verified
	       if (user.profile.invitedBoards && user.profile.invitedBoards.length > 0 && user.emails[0].verified == true) {
	           const invitedBoards = user.profile.invitedBoards;
	           
	        	 for (var i = 0; i< invitedBoards.length ;i++) {
	             const board = Boards.findOne({_id: invitedBoards[i] })
	             var inviterId = '';
	             
	             if (board && board._id)  {
	            	 
	               inviterId = board.members.filter(obj => { return obj.isAdmin == true;})[0].userId;
	               console.log('inviterId '+inviterId);
	               const inviter = Users.findOne({_id: inviterId});
	               
                 try {
                	 
                	 const logoUrl = Meteor.absoluteUrl() + 'rh-logo.png';
                	 const params = {
                   user: user.username,
                   inviter: inviter.username,
                   board: Boards.findOne({_id: invitedBoards[i] }).title,
                   url: Boards.findOne({_id: invitedBoards[i] }).absoluteUrl(),
                   logoUrl: logoUrl
                 };
                	 
                  const lang = Users.findOne({_id: user._id}).getLanguage();
                   Email.send({
                     to: user.emails[0].address.toLowerCase(),
                     from: Accounts.emailTemplates.from,
                     subject: TAPi18n.__('email-invite-subject', params, lang),
                     text: TAPi18n.__('email-invite-text', params, lang).replace(/(<([^>]+)>)/gi, ""),
                     html: '<!DOCTYPE html><html lang="en"><head> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">' + TAPi18n.__('email-invite-text', params, lang),
                  });
                } catch (e) {
                   throw new Meteor.Error('email-fail', e.message);
                }
	            }
	          }
	        }
	     });
	  },
	});
  
  SyncedCron.add({
	  name: 'send-remainders-invitees',
	  schedule: function(parser) {
	    return parser.text('at 5:10 pm');
	  },
	  job: function() {
	     Users.find({
	      'emails.verified':false
	     }).forEach((user) => {
	    	   if (user.emails[0].verified == false) {
	          //if user email is not verified
	          var token = Random.secret();
	    		  var newDate = new Date();
	    	    var tokenRecord = JSON.parse(JSON.stringify({
	    	  	      token: token,
	    	          email: user.emails[0].address.toLowerCase(),
	    	          when: newDate,
	    	          reason: 'enroll'
	    	        }));
	    	   Users.update({ _id: user._id }, {
	    	    $set: {
	            'services.password.reset': tokenRecord
	          }
	    	  });
	    	  // before passing to template, update user object with new token
  	      Meteor._ensure(user, 'services', 'password').reset = tokenRecord;
  	      const enrollLink = Accounts.urls.enrollAccount(token);
  	      const logoUrl = Meteor.absoluteUrl() + 'rh-logo.png';
  	      const parameters = {
  	          user: user.username,
  	          enrollUrl: enrollLink,
  	          logoUrl: logoUrl
  	        };
  	      const lang = Users.findOne({_id: user._id}).getLanguage();
  	      try {
  	      	const message = '<!DOCTYPE html><html lang="en"><head> <meta http-equiv="Content-Type" content="multipart/mixed; charset=UTF-8">' + TAPi18n.__('email-enroll-text', parameters, lang);
  	      	Email.send({
  	    	    to: user.emails[0].address.toLowerCase(),
  	          from: Accounts.emailTemplates.from,
  	          subject: TAPi18n.__('email-enroll-subject', parameters, lang),
  	          html: message,
  	          text: message
  	        });
  	     } catch (e) {
  	      	throw new Meteor.Error('email-fail', e.message);
  	     }
	      }
	    });
	  }
  });
  
}

