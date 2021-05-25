/*if (Meteor.isServer) {
	Meteor.startup(() => {
	  SyncedCron.add({
		  name: 'send-remainders-users',
		  schedule: function(parser) {
		    return parser.text('at 3:06 am');
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
		  		          	  //if emailDate in collection is equal to today's date
		  		          	  if (emailDate.toLocaleDateString("en-GB") === date.toLocaleDateString("en-GB")) {
		  		          	  	  console.log('sending ...'+user._id);
		  		              	  try {
		  		              	  	const message = remainder.messageContent;
	          	  	      	    Email.send({
	          	  	    	        to: user.emails[0].address.toLowerCase(),
	          	  	              from: Accounts.emailTemplates.from,
	          	  	              subject: remainder.messageContent.subject,
	          	  	              html: remainder.messageContent.content,
	          	  	              text: remainder.messageContent.content.replace(/(<([^>]+)>)/gi, "")
	          	  	            });
	          	  	      	  } catch (e) {
	          	  	      	    throw new Meteor.Error('email-fail', e.message);
	          	  	      	  }
		  		             }
		  		          	
		  		          	 Remainders.update(
		  		          			{_id: remainder._id},
		  		          			{$set: { nextRunAt: date.setDate(date.getDate() + 3),
		  		          				lastRunAt: new Date()
		  		          			}
		  		             });
		  		         }
		  	     });
		     },
		 });
	});
}*/

