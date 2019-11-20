// Template.cards.events({
//   'click .member': Popup.open('cardMember')
// });

BlazeComponent.extendComponent({
	onRendered(){
		// Method to help in re-initialising the draggables for the Labels
    function turnLabelsToDraggables() {
      $('div.minicard-label').draggable({
        start: function(event, ui) {
          ui.helper.css('z-index', 2000);
        },
        drag: function() {},
        stop: function() {
          var stoppedAtCardId = $(event.target).closest('.minicard-wrapper').find('.minicard-title').data('card-id');
          var sourceCardId = $(this).closest('.minicard-labels').siblings('.minicard-title').data('card-id');
          var labelId = $(this).data('label-id');
          var labelColor = $(this).data('color');

          if (stoppedAtCardId !== sourceCardId) {
          	Cards.update({
      				_id: sourceCardId
      			}, {
      				$pull: {
      					labelIds: labelId, 
    					} 
      			});
          } else if (stoppedAtCardId === sourceCardId) {
          	// Moved on same card, place it in its correct place
          	var displacedlabel = '<div class="minicard-label card-label-'+labelColor+'" title="" data-label-id='+labelId+' data-color='+labelColor+' style="position: relative;"></div>';
          	$(this).closest('.minicard').find('.minicard-labels').append(displacedlabel);
          	$(this).remove();
          }

        	// Call method to re-initialise the draggables for the Labels
        	turnLabelsToDraggables();
        }
      });
    }

    // Initialising the draggables for the Labels
    $('div.minicard-label').draggable({
      start: function(event, ui) {
        ui.helper.css('z-index', 2000);
      },
      drag: function() {},
      stop: function() {
        var stoppedAtCardId = $(event.target).closest('.minicard-wrapper').find('.minicard-title').data('card-id');
        var sourceCardId = $(this).closest('.minicard-labels').siblings('.minicard-title').data('card-id');
        var labelId = $(this).data('label-id');
        var labelColor = $(this).data('color');

        if (stoppedAtCardId !== sourceCardId) {
        	Cards.update({
    				_id: sourceCardId
    			}, {
    				$pull: {
    					labelIds: labelId, 
  					} 
    			});
        } else if (stoppedAtCardId === sourceCardId) {
        	// Moved on same card, place it in its correct place
        	var displacedlabel = '<div class="minicard-label card-label-'+labelColor+'" title="" data-label-id='+labelId+' data-color='+labelColor+' style="position: relative;"></div>';
        	$(this).closest('.minicard').find('.minicard-labels').append(displacedlabel);
        	$(this).remove();
        }

      	// Call method to re-initialise the draggables for the Labels
      	turnLabelsToDraggables();
      }
    });
	},

  template() {
    return 'minicard';
  },

  events() {
    return [{
      'click .js-linked-link' () {
        if (this.data().isLinkedCard())
          Utils.goCardId(this.data().linkedId);
        else if (this.data().isLinkedBoard())
          Utils.goBoardId(this.data().linkedId);
      },
    }];
  },
}).register('minicard');
