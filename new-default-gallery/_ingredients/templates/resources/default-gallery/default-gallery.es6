// ===================================================================
//
//  LiveWhale Default Gallery
// 
// ===================================================================

;(function($) {

  // Set the default image sizes here in pixels
  const defaultThumbWidth = 420;
  const defaultThumbHeight = 420;
  const defaultImageWidth = 800; // height is always auto


  // Begin fullscreen gallery plugin
  $.widget('lw.lw_fsg', {

    // Fullscreen gallery options
    options: {
      gallery_id: false,        // number, a LiveWhale gallery id must be provided
      width: defaultImageWidth, // number, the fullscreen gallery image width in pixels
      destroyOnClose: false     // boolean, removes the gallery from the DOM on close
    },

    // Initialize the fullscreen gallery
    // _create will automatically run the first time this widget is called.
    _create: function() {

      const self = this; 
      const $body = $('body');

      // Assign a random id and store as a global variable
      self.id = Math.floor(1000 + Math.random() * 9000);

      // If no gallery id is passed, escape the function
      if ( !self.options.gallery_id ) {
        return;
      }

      // Plug the gallery id into an inline gallery widget
      // {image} receives the thumb_width and thumb_height 
      if ( self.options.gallery_id ) {
        const args = {
          id: [{value: self.options.gallery_id}],
          thumb_width: self.options.width, 
          thumb_height: 'auto',
          clean_markup: true,
          format_widget: '<section class="lw_fsg" tabindex="-1" style="pointer-events:none; visibility: hidden; opacity:0; z-index: -9999;" aria-roledescription="carousel"><div class="lw_fsg_inner"><h4 class="lw_fsg_title">{title}</h4><div class="lw_fsg_nav"><button class="lw_fsg_nav_btn prev" title="Previous image" aria-label="previous image" aria-controls="carousel-{id}">Prev »</button><button class="lw_fsg_nav_btn next" title="Next image" aria-label="next image" aria-controls="carousel-{id}">Next »</button></div><ul class="lw_fsg_images" id="carousel-{id}"  aria-live="polite">{widget}</ul></div><button class="lw_fsg_close" title="Close gallery" aria-label="close gallery"></button><div class="lw_fsg_loader is-visible"><div class="lw_fsg_loader-line"></div><div class="lw_fsg_loader-line"></div><div class="lw_fsg_loader-line"></div><div class="lw_fsg_loader-line"></div></div></section>',
          format: '<li class="lw_fsg_image" role="group" aria-roledescription="slide"><figure>{image}<figcaption>{<div class="lw_fsg_caption">|caption|</div>}{<div class="lw_fsg_caption">|credit|</div>}</figcaption></figure></li>',
        };
        const widget = livewhale.lib.getWidgetMarkup(null, 'galleries_inline', args);
        const url = livewhale.liveurl_dir + '/widget/preview/?syntax=' + encodeURIComponent(widget);

        // Load the new inline gallery from the server
        $.get(url, function(gallery) {

          // Insert the gallery markup into the page 
          $(gallery).attr('id', 'fsg_'+self.id).appendTo($body);

          // Open the fullscreen gallery 
          self._open();

          // The trigger element is the jQuery object which called the plugin
          self.triggerEl = $(self.element);  

          // Open the fullscreen modal when the trigger is clicked
          self.triggerEl.on('click', function(e){ 
            self._open();
          });

          // Close fullscreen modal when close button is clicked
          $body.on('click', '#fsg_'+self.id+' .lw_fsg_close', function(){
              self._close();
          });

          // Store variables for changing the image
          const $thisGallery = $('#fsg_'+self.id);
          const $allImages = $thisGallery.find('.lw_fsg_image');
          const $prevArrow = $thisGallery.find('.fsgallery-nav').find('.prev');
          const $nextArrow = $thisGallery.find('.fsgallery-nav').find('.next');
          let   $subImage; 

          // Change image on nav click
          $body.on('click', '#fsg_'+self.id+' .lw_fsg_nav_btn', function(e) {
            e.preventDefault();
            const $this = $(this);

            if ( $this.hasClass('prev') ) {
              $subImage = $allImages.filter('.lw_fsg_selected').prev().length < 1 ? $allImages.last() : $allImages.filter('.lw_fsg_selected').prev();
              self._trigger( 'prevImage' ); // Trigger event: prevImage
            }

            if ( $this.hasClass('next') ) {
              $subImage = $allImages.filter('.lw_fsg_selected').next().length < 1 ? $allImages.first() : $allImages.filter('.lw_fsg_selected').next();
              self._trigger( 'nextImage' ); // Trigger event: nextImage
            }

            // Replace selected image with the substitute image
            $allImages.removeClass('lw_fsg_selected').attr('aria-hidden', 'true');
            $subImage.addClass('lw_fsg_selected').attr('aria-hidden', 'false');
            self._trigger( 'changeImage' ); // Trigger event: changeImage

            return true;
          });

          // Respond to keypresses
          $body.keydown(function(e) {

            const keyCode = e.which;

            // If gallery modal is closed
            if ( !$body.hasClass('lw_fsg_open') && !$('#fsg_'+self.id).hasClass('lw_fsg_open')) {

              // If space bar or return are pressed while focusing the trigger element, open this gallery
              if( self.triggerEl.is(':focus') && ( keyCode == 13 || keyCode == 32 ) ) {
                e.preventDefault();
                self._open();
              }
            }

            // If this gallery is open 
            if ( $('#fsg_'+self.id).hasClass('lw_fsg_open') && $body.hasClass('lw_fsg_open') ) {

              // If escape key is pressed, close the fullscreen modal 
              if(keyCode == 27) { 
                self._close();
              }

              // If left or right arrows keys are pressed, change the image
              if( keyCode == 37 || keyCode == 39 ) {

                if( keyCode == 37 ) { // left
                  $subImage = $allImages.filter('.lw_fsg_selected').prev().length < 1 ? $allImages.last() : $allImages.filter('.lw_fsg_selected').prev();
                  self._trigger( 'prevImage' ); // Trigger event: prevImage
                  $prevArrow.addClass('is-keypress'); // Highlight arrow button
                  setTimeout(function(){
                    $prevArrow.removeClass('is-keypress');
                  }, 500);
                }
                else if( keyCode == 39 ) { // right
                  $subImage = $allImages.filter('.lw_fsg_selected').next().length < 1 ? $allImages.first() : $allImages.filter('.lw_fsg_selected').next();
                  self._trigger( 'nextImage' ); // Trigger event: nextImage
                  $nextArrow.addClass('is-keypress'); // Highlight arrow button
                  setTimeout(function(){
                    $nextArrow.removeClass('is-keypress');
                  }, 500);
                }

                // Replace selected image with the substitute image
                $allImages.removeClass('lw_fsg_selected').attr('aria-hidden', 'true');
                $subImage.addClass('lw_fsg_selected').attr('aria-hidden', 'false');
                self._trigger( 'changeImage' ); // Trigger event: changeImage
              }
            }
          });


        });
      }
    },


    // Removes fullscreen gallery from the DOM
    destroy: function () {
      const self = this;
      $('#fsg_'+self.id).remove();
    },


    // Opens the fullscreen gallery modal 
    // if an image is passed, it is displayed first
    _open: function( $image ) {

      const self = this;
      const $body = $('body');

      // If the gallery is not currently open
      if ( !$body.hasClass('lw_fsg_open') ) {

        // Prevent scroll on body element while gallery is open
        $body.addClass('lw_fsg_open');

        // Open the gallery
        const $fsg = $('#fsg_'+self.id).addClass('lw_fsg_open').attr('aria-hidden', 'false').attr('tabindex','0').focus();

        // If an image is passed, extract the image name 
        const imageName = ( $image && $image.length ) ? $image.attr('src').substr($image.attr('src').lastIndexOf('/') + 1) : false; 

        // Show this image, otherwise show the first image by default
        const $allImages = $fsg.find('.lw_fsg_image');
        const $firstImage = ( imageName && imageName.length ) ? $allImages.find('img[src*="'+imageName+'"]').parent('.lw_fsg_image') : $allImages.first(); 

        // Reveal gallery after the image displayed first has successfully loaded
        $firstImage.imagesLoaded().done(function() {
          $fsg.find('.lw_fsg_inner').addClass('is-visible');
          $fsg.find('.lw_fsg_loader').removeClass('is-visible');
        }).addClass('lw_fsg_selected').attr('aria-hidden', 'false');
      }

      self._trigger( 'open' ); // Trigger event: open
    },


    // Closes the fullscreen modal
    _close: function( ) {

      const self = this;
      const $body = $('body');

      // Remove body class, allows other galleries to open
      $body.removeClass('lw_fsg_open');

      // Move focus back to the gallery trigger
      self.triggerEl.focus();

      // Hide the gallery modal
      const $fsg = $('#fsg_'+self.id).removeClass('lw_fsg_open').attr('aria-hidden', 'true').attr('tabindex','-1');

      // Shrink the current image
      const $selectedImage = $fsg.find('.lw_fsg_selected').addClass('is-closed');

      // Then hide the overlay and reset selected image
      $fsg.find('lw_fsg_inner').removeClass('is-visible');
      $selectedImage.removeClass('is-closed lw_fsg_selected').attr('aria-hidden', 'true');

      // If destroyOnClose is true, remove gallery from the DOM
      if ( self.options.destroyOnClose ) {
        self.destroy();
      }

      self._trigger( 'close' ); // Trigger event: close
    }
  });
  // end fullscreen gallery plugin


  // Function to initialize each lw_gallery 
  function initLWGalleries() {

    $('.lw_gallery').each(function(){

      const $gallery = $(this);
      const $galleryPreview = $gallery.find('.lw_gallery_preview');

      if ( $gallery.attr('data-fsg-initialized') ) {
        
        // Do nothing if gallery already initialized
        return true;

      } else {

        // Load the first gallery thumbnail image 
        const $galleryPreviewImg = $gallery.find('.lw_gallery_thumbs').find('.lw_gallery_thumb').first().clone();
        const encodedHTML = $galleryPreviewImg.text();
        if ( encodedHTML ) {
          $galleryPreviewImg.empty().append($(encodedHTML)).appendTo($galleryPreview);
        }

        // Wait until first click to load the fullscreen gallery
        $galleryPreview.one('click', function(e){
          e.preventDefault();
          $(this).lw_fsg({
            gallery_id: $gallery.data('gallery-id'), 
            width: $gallery.data('gallery-width')
          });
        });

        // Mark the gallery as initialized 
        $gallery.attr('data-fsg-initialized', true);
      }
    });
  }

  // Expose the gallery function globally
  livewhale.initLWGalleries = initLWGalleries;

  // Call the function
  livewhale.initLWGalleries();


}(livewhale.jQuery));
