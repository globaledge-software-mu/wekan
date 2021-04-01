if (Meteor.isServer) {
  SyncedCron.add({
	  name: 'send-remainders-users',
	  schedule: function(parser) {
	    return parser.text('at 4:20 pm');
	  },
	  job: function() {
	  	   Remainders.find().forEach((remainder) => {
	  		           const user = Users.findOne({_id:remainder.invitee});
	  		           const date = new Date();
	  		           if (user && user._id ) {
	  		          	  
	  		          	  let emailDate = remainder.nextRunAt;
	  		          	  if (emailDate != '' || emailDate == 'undefined') {
	  		          	    emailDate = new Date();
	  		          	  }
	  		          	  
	  		          	  if (emailDate.toLocaleDateString("en-GB") === date.toLocaleDateString("en-GB")) {
	  		          	  	
	  		          	    console.log('sending ...'+user._id);
	  		                if (user.profile.invitedBoards && 
	  		                   user.profile.invitedBoards.length > 0 && 
	  		                   user.emails[0].verified == true) {
	  		            	 
	  		                    const invitedBoards = user.profile.invitedBoards;
              	  	        for (var i = 0; i< invitedBoards.length ;i++) {
            	                 const board = Boards.findOne({_id: invitedBoards[i] })
            	                 var inviterId = '';
            	             
            	                 if (board && board._id)  {
            	              	   inviterId = board.members.filter(obj => { return obj.isAdmin == true;})[0].userId;
            	                   
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
              	  	      
	  		              } else {
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
	  		               
	  		            }
	  		          	
	  		          	Remainders.update({_id: remainder._id}, {
	  		          		           $set: { 
	  		          		             nextRunAt: date.setDate(date.getDate() + 3) 
	  		          		           }
	  		          		        });
	  		         }
	  	     });
	     },
	 });
}

