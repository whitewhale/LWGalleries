// ===================================================================
//
//  LiveWhale Default Gallery
// 
// ===================================================================

;(function($) {

  // set the default image sizes here in pixels
  const defaultThumbWidth = 420;
  const defaultThumbHeight = 420;
  const defaultImageWidth = 800;


  // Begin fullscreen gallery plugin
  $.widget('lw.lw_fsg', {

    // Default options
    options: {
      gallery_id: false,        // a LiveWhale gallery id must be passed for the gallery to work
      width: defaultImageWidth, // a number denoting the image width in pixels
      destroyOnClose: false     // remove the fullscreen gallery HTML on close
    },

    // Initialize the fullscreen gallery. _create will automatically run the first time this widget is called.
    _create: function() {

      var self = this; 

      var $body = $('body');

      // Assign a random id and store as a global variable
      self.id = Math.floor(1000 + Math.random() * 9000);

      // If no gallery id is passed, escape the function
      if ( !self.options.gallery_id ) {
        return;
      }

      // Plug the gallery id into an inline gallery widget
      // the {image} is set to the thumb_width and thumb_height 
      if ( self.options.gallery_id ) {
        const args = {
          id: [{value: self.options.gallery_id}],
          thumb_width: self.options.width, 
          thumb_height: 'auto',
          clean_markup: true,
          format_widget: '<section class="lw_fsg" tabindex="-1" style="pointer-events:none; visibility: hidden; opacity:0; z-index: -9999;" aria-roledescription="carousel"><div class="lw_fsg_inner"><h4 class="lw_fsg_title">{title}</h4><div class="lw_fsg_nav"><button class="lw_fsg_nav_btn prev" title="Previous image" aria-label="previous image" aria-controls="carousel-{id}">Prev »</button><button class="lw_fsg_nav_btn next" title="Next image" aria-label="next image" aria-controls="carousel-{id}">Next »</button></div><ul class="lw_fsg_images" id="carousel-{id}">{widget}</ul></div><button class="lw_fsg_close" title="Close gallery" aria-label="close gallery"></button><div class="lw_fsg_loader is-visible"><div class="lw_fsg_loader-line"></div><div class="lw_fsg_loader-line"></div><div class="lw_fsg_loader-line"></div><div class="lw_fsg_loader-line"></div></div></section>',
          format: '<li class="lw_fsg_image" role="group" aria-roledescription="slide"><figure>{image}<figcaption>{<div class="lw_fsg_caption">|caption|</div>}{<div class="lw_fsg_caption">|credit|</div>}</figcaption></figure></li>',
        };
        const widget = livewhale.lib.getWidgetMarkup(null, 'galleries_inline', args);
        const url = livewhale.liveurl_dir + '/widget/preview/?syntax=' + encodeURIComponent(widget);

        // Load the inline gallery from the server
        $.get(url, function(gallery) {

          // Insert the gallery markup into the page 
          $(gallery).attr('id', 'fsg_'+self.id).appendTo($body);

          // Open the fullscreen gallery 
          self._open();
        });
      }

      // Set the trigger element
      self.triggerEl = $(self.element);  

      // Open fullscreen gallery when the trigger element is clicked
      self.triggerEl.on('click', function(e){ 
        self._open();
      });

      // Open fullscreen gallery if trigger element is focused and space or enter is pressed
      $body.keydown(function(e) {
        if ( self.triggerEl.is(':focus') ) {
          var keyCode = e.which;
          if( keyCode == 13 || keyCode == 32 ) { // if pressing space bar or return
            e.preventDefault();
            self._open();
          }
        }
      });

      // Change image on nav click
      $body.on('click', '#fsg_'+self.id+' .lw_fsg_nav_btn', function(e) {

        e.preventDefault();
        var $this = $(this);
        var $allImages = $('#fsg_'+self.id).find('.lw_fsg_image');
        var $subImage; // the new substitute image

        if ( $this.hasClass('prev')) {
          
          // Find the previous image
          $subImage = $allImages.filter('.lw_fsg_selected').prev();
          if ( $subImage.length < 1 ) {
            $subImage = $allImages.last();
          }
          self._trigger( 'prevImage' );
        }

        if ( $this.hasClass('next')) {

          // Find the next image
          $subImage = $allImages.filter('.lw_fsg_selected').next();
          if ( $subImage.length < 1 ) {
            $subImage = $allImages.first();
          }
          self._trigger( 'nextImage' );
        }

        // Replace selected image with the substitute image
        $allImages.removeClass('lw_fsg_selected').attr('aria-hidden', 'true');
        $subImage.addClass('lw_fsg_selected').attr('aria-hidden', 'false');

        // Trigger an event when the image changes 
        self._trigger( 'changeImage' );

        return true;
      });


      // Close fullscreen modal when close button is clicked
      $body.on('click', '#fsg_'+self.id+' .lw_fsg_close', function(){
          self._close();
      });

      // Respond to keypresses
      $body.keydown(function(e) {



        // If this gallery is open and escape key is pressed
        // close the fullscreen modal 
        if ( $('#fsg_'+self.id).hasClass('lw_fsg_open') && $body.hasClass('lw_fsg_open') ) {
          var keyCode = e.which;
          if(keyCode == 27) { 
            self._close();
          }
        }
      });
    },


    // Removes fullscreen gallery from the DOM
    destroy: function () {
      var self = this;
      $('#fsg_'+self.id).remove();
    },


    // Opens the fullscreen gallery modal 
    // if an image is passed it is displayed first
    _open: function( $image ) {

      var self = this;
      var $body = $('body');

      // If the gallery is not currently open
      if ( !$body.hasClass('lw_fsg_open') ) {

        // Prevent scroll on body element while gallery is open
        $body.addClass('lw_fsg_open');

        // Open the gallery
        var $fsg = $('#fsg_'+self.id).addClass('lw_fsg_open').attr('aria-hidden', 'false').attr('tabindex','0').focus();

        // Show the first image first by default
        var $allImages = $fsg.find('.lw_fsg_image');
        var $firstImage = $allImages.first(); 

        // If an image is passed, show this image first
        if ( $image && $image.length ) {
          // extract this image id and name 
          var imageName = $image.attr('src').substr($image.attr('src').lastIndexOf('/') + 1); 
          if ( imageName.length ) {
            // find this image in our gallery
            $firstImage = $allImages.find('img[src*="'+imageName+'"]').parent('.lw_fsg_image'); 
          }
        }

        // Reveal gallery after the image displayed first has successfully loaded
        $firstImage.imagesLoaded().done(function() {
          $fsg.find('.lw_fsg_inner').addClass('is-visible');
          $fsg.find('.lw_fsg_loader').removeClass('is-visible');
        }).addClass('lw_fsg_selected').attr('aria-hidden', 'false');
      }

      // Trigger an event when the gallery opens
      self._trigger( 'open' );
    },


    // Closes the fullscreen modal
    _close: function( ) {

      var self = this;

      // Remove body class, allows other galleries to open
      $('body').removeClass('lw_fsg_open');

      // Move focus back to the gallery trigger
      self.triggerEl.focus();

      // Hide the gallery modal
      var $fsg = $('#fsg_'+self.id).removeClass('lw_fsg_open').attr('aria-hidden', 'true').attr('tabindex','-1');

      // Shrink the current image
      var $selectedImage = $fsg.find('.lw_fsg_selected').addClass('is-closed');

      // Then hide the overlay and reset selected image
      $fsg.find('lw_fsg_inner').removeClass('is-visible');
      $selectedImage.removeClass('is-closed lw_fsg_selected').attr('aria-hidden', 'true');

      // If destroyOnClose is true, remove gallery from the DOM
      if ( self.options.destroyOnClose ) {
        self.destroy();
      }

      // Trigger an event when the gallery closes
      self._trigger( 'close' );
    }
  });
  // End fullscreen gallery plugin


  // Now, for each lw_gallery
  // load the preview thumbnail
  // set up the fullscreen gallery to load/open on click
  $('.lw_gallery').each(function(){

    const $gallery = $(this);
    const $galleryPreview = $gallery.find('.lw_gallery_preview');

    // Load the first thumbnail image initially
    const $galleryPreviewImg = $gallery.find('.lw_gallery_thumbs').find('.lw_gallery_thumb').first().clone();
    const encodedHTML = $galleryPreviewImg.text();
    if ( encodedHTML ) {
      $galleryPreviewImg.empty().append($(encodedHTML)).appendTo($galleryPreview);
    }

    // Load fullscreen gallery on first click 
    $galleryPreview.one('click', function(e){
      e.preventDefault();
      $(this).lw_fsg({
        gallery_id: $gallery.data('gallery-id'), 
        width: $gallery.data('gallery-width')
      });
    });

  });



}(livewhale.jQuery));
