// ===================================================================
//
//  LiveWhale Default Gallery
// 
// ===================================================================

;(function($) {

  // Begin fullscreen gallery modal plugin
  $.widget('lw.lw_gallery_modal', {

    // Options
    options: {
      modal_id: false,      // number, an id must be passed
      destroyOnClose: false   // boolean, removes the modal from the DOM on close
    },

    // Initialize the fullscreen gallery modal
    // _create will automatically run the first time this widget is called
    _create: function() {

      const self = this; 
      const $body = $('body');

      // Add global variable for the modal id
      self.id = self.options.modal_id;

      // Store other variables for this function
      const $modal = $(`#lw_modal_${self.id}`);
      const $title = $modal.find('.lw_gallery_title');
      const $slides = $modal.find('.lw_gallery_slide');
      const $slideImages = $slides.find('.lw_gallery_slide_image');
      const $slideCaptions = $slides.find('.lw_gallery_slide_caption');
      const $arrows = $modal.find('.lw_gallery_arrow');
      let   $subSlide; 

      // For each slide
      $slides.each(function(i) {
        const $thisSlide = $(this);

        // Add aria-label for slide count
        $thisSlide.attr('aria-label', `Slide ${i+1} of ${$slides.length}`);

        // Load the full-size gallery image for each slide
        const $thisImage = $thisSlide.find('.lw_gallery_slide_image');
        const encodedHTML =  $thisImage.text();
        if ( encodedHTML ) {
          $thisImage.empty().append($(encodedHTML)); // decode the image
        }
      });

      // Open the fullscreen gallery 
      self._open();

      // The trigger element is the jQuery object which called the plugin
      self.triggerEl = $(self.element);  

      // Open the fullscreen modal for subsequent clicks on the trigger element
      self.triggerEl.on('click', function(e){ 
        e.preventDefault();
        self._open();
      });

      // Close fullscreen modal when close button is clicked
      $body.on('click', `#lw_modal_${self.id} .lw_gallery_close`, function(){
          self._close();
      });

      // Close fullscreen modal when clicking outside the image, arrows and captions in the modal
      $body.on('click touchstart', function(e) {
        if ( ( $modal.is(e.target) || $modal.has(e.target).length ) &&
             ( !$title.is(e.target) && $title.has(e.target).length === 0 ) &&
             ( !$slideImages.is(e.target) && $slideImages.has(e.target).length === 0 ) &&
             ( !$slideCaptions.is(e.target) && $slideCaptions.has(e.target).length === 0 ) &&
             ( !$arrows.is(e.target) && $arrows.has(e.target).length === 0 ) ) {
          self._close();
        }
      });

      // Change slide on arrow click
      $body.on('click', `#lw_modal_${self.id} .lw_gallery_arrow`, function(e) {
        e.preventDefault();
        const $this = $(this);

        if ( $this.hasClass('prev') ) {
          $subSlide = $slides.filter('.lw_gallery_selected').prev().length < 1 ? $slides.last() : $slides.filter('.lw_gallery_selected').prev();
          self._trigger( 'prevSlide' ); // Trigger event: prevSlide
        }

        if ( $this.hasClass('next') ) {
          $subSlide = $slides.filter('.lw_gallery_selected').next().length < 1 ? $slides.first() : $slides.filter('.lw_gallery_selected').next();
          self._trigger( 'nextSlide' ); // Trigger event: nextSlide
        }

        // Replace selected slide with the substitute slide
        $slides.removeClass('lw_gallery_selected');
        $subSlide.addClass('lw_gallery_selected');
        self._trigger( 'changeSlide' ); // Trigger event: changeSlide

        return true;
      });

      // Respond to keypresses
      $body.keydown(function(e) {

        const keyCode = e.which;

        // If gallery modal is closed
        if ( !$body.hasClass('lw_gallery_open') && !$(`#lw_modal_${self.id}`).hasClass('lw_gallery_open')) {

          // If space bar or return are pressed while focusing the trigger element, open this gallery
          if( self.triggerEl.is(':focus') && ( keyCode === 13 || keyCode === 32 ) ) {
            e.preventDefault();
            self._open();
          }
        }

        // If this gallery is open 
        if ( $(`#lw_modal_${self.id}`).hasClass('lw_gallery_open') && $body.hasClass('lw_gallery_open') ) {

          // If escape key is pressed, close the fullscreen modal 
          if( keyCode === 27 ) { 
            self._close();
          }

          // If left or right arrows keys are pressed, change the image
          if( keyCode === 37 || keyCode === 39 ) {

            if( keyCode === 37 ) { // left
              $subSlide = $slides.filter('.lw_gallery_selected').prev().length < 1 ? $slides.last() : $slides.filter('.lw_gallery_selected').prev();
              $arrows.filter('.prev').focus(); 
              self._trigger( 'prevSlide' ); // Trigger event: prevSlide
            }
            else if( keyCode === 39 ) { // right
              $subSlide = $slides.filter('.lw_gallery_selected').next().length < 1 ? $slides.first() : $slides.filter('.lw_gallery_selected').next();
              $arrows.filter('.next').focus(); 
              self._trigger( 'nextSlide' ); // Trigger event: nextSlide
            }

            // Replace selected slide with the substitute slide
            $slides.removeClass('lw_gallery_selected');
            $subSlide.addClass('lw_gallery_selected');
            self._trigger( 'changeSlide' ); // Trigger event: changeSlide
          }

          // If tab key is pressed, trap focus within the modal
          if ( keyCode === 9 ) {

            const $focusableFirst = $arrows.filter('.prev'); 
            const $focusableLast = $modal.find('.lw_gallery_close'); 

            if ( e.shiftKey ) { 

              // Move focus to last focusable element 
              // when shift+tabbing from first focusable element
              if ( document.activeElement === $focusableFirst.get(0) ) {
                e.preventDefault();
                $focusableLast.focus();
              }

            } else {

              // Move focus to first focusable element 
              // when tabbing from last focusable element
              if ( document.activeElement ===  $focusableLast.get(0) ) {
                e.preventDefault();
                $focusableFirst.focus();
              }
            }
          }
        }
      });
    },


    // Removes fullscreen gallery from the DOM
    destroy: function () {
      const self = this;
      $(`#lw_modal_${self.id}`).remove();
    },


    // Opens the fullscreen gallery modal 
    // if an image is passed, it is displayed first
    _open: function( $image ) {

      const self = this;
      const $body = $('body');

      // If the gallery is not currently open
      if ( !$body.hasClass('lw_gallery_open') ) {

        // Prevent scroll on body element while gallery is open
        $body.addClass('lw_gallery_open');

        const $modal = $(`#lw_modal_${self.id}`);
        const $loader = $modal.find('.lw_gallery_loader');
        const $slides = $modal.find('.lw_gallery_slide');

        // Add visiblity to the loader icon
        $loader.addClass('is-visible');

        // Open the modal 
        $modal.addClass('lw_gallery_open').attr('aria-hidden', 'false');

        // If an image is passed, make this the opening slide
        const imageName = ( $image && $image.length ) ? $image.attr('src').substr($image.attr('src').lastIndexOf('/') + 1) : false; 
        const $selectedSlide = ( imageName && imageName.length ) ? $slides.find('img[src*="'+imageName+'"]').parent('.lw_gallery_slide') : $slides.first(); 

        // Select this slide and open the gallery once the full-size image loads
        $selectedSlide.addClass('lw_gallery_selected').imagesLoaded().done(function() {
          $loader.removeClass('is-visible').attr('aria-hidden', 'true');
          $modal.find('.lw_gallery_modal_inner').addClass('is-visible');

          // move focus to the first focusable element in the modal
          $modal.find('.lw_gallery_arrow').filter('.prev').focus();
        });
      }

      // Trigger event: open
      self._trigger( 'open' ); 
    },


    // Closes the fullscreen modal
    _close: function( ) {

      const self = this;
      const $body = $('body');
      const $modal = $(`#lw_modal_${self.id}`);
      const $selectedSlide = $modal.find('.lw_gallery_selected');

      // Shrink the current slide and fade the modal contents
      $modal.find('.lw_gallery_modal_inner').removeClass('is-visible');

      // Pause then...
      setTimeout(function(){

        // Fade the modal 
        $modal.removeClass('lw_gallery_open').attr('aria-hidden', 'true');

        // Reset slide selection
        $selectedSlide.removeClass('lw_gallery_selected');

        // Remove body class, allows other galleries to open
        $body.removeClass('lw_gallery_open');

        // Move focus back to the gallery trigger
        self.triggerEl.focus();

        // If destroyOnClose is true, remove gallery from the DOM
        if ( self.options.destroyOnClose ) {
          self.destroy();
        }

        // Trigger event: close
        self._trigger( 'close' );
      }, 300);
    }
  });
  // end fullscreen gallery plugin



  // Function to initialize galleries
  function initLWGalleries() {

    console.log('running initLWGalleries');

    $('.lw_gallery').each(function(){

      console.log('there is a gallery');      

      const $gallery = $(this);

      if ( $gallery.attr('data-gallery-initialized') ) {
        
        // do nothing if gallery already initialized
        return true;

      } else {

        // otherwise initialize the gallery
        const $galleryModal = $gallery.find('.lw_gallery_modal');

        // first, check the number of slides
        const numSlides = $gallery.find('.lw_gallery_slide').length;

        // remove the modal if there is only one slide
        if ( numSlides < 2 ) {

          $galleryModal.remove();
          $gallery.addClass('lw_gallery--single');

        } else { 

          // if there are multiple slides, set up the fullscreen gallery
        
          // assign a random id for aria controls and JS functions
          const id = Math.floor(1000 + Math.random() * 9000);

          // add this id to the modal, move modal to the end of <body>
          $galleryModal.attr('id', `lw_modal_${id}`).attr('aria-labelledby', `lw_modal_title_${id}`).appendTo($('body'));

          // assign title an id for aria-labelledby
          const $title = $galleryModal.find('.lw_gallery_title');
          $title.attr('id', `lw_modal_title_${id}`);

          // wrap the inner gallery with a link to open the modal
          $gallery.addClass('lw_gallery--multiple')
                  .wrapInner(`<a class="lw_gallery_open" href="#" role="button" title="Open gallery: ${$title.text()}" aria-label="Open gallery: ${$title.text()}" aria-controls="lw_modal_${id}">`);

          // when this gallery link is first clicked
          // call plugin to initialize the modal behavior and load full-size gallery images
          $gallery.find('.lw_gallery_open').one('click', function(e){
            e.preventDefault();
            $(this).lw_gallery_modal({
              modal_id: id
            });
          });
        }

        // Mark the gallery as initialized 
        $gallery.attr('data-gallery-initialized', true);
      }
    });
  }

  
  // Expose the gallery function globally
  livewhale.initLWGalleries = initLWGalleries;

  
  // Call the function when this file loads
  // This runs whenever a gallery widget loads this file
  // This runs when a calendar event view with a gallery is first loaded
  livewhale.initLWGalleries();


  // Call the function for subsequent loads of the calendar event view
  $('body').bind('calLoad.lwcal', function(e, controller, data) {
    const view = controller.getView();
    if ('event' === view) {
      initLWGalleries();
    }
  });



}(livewhale.jQuery));