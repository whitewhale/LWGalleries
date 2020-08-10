/**********************************************
 *
 *  Large Gallery
 *  --------------------
 *
 *  Docs: https://github.com/whitewhale/LWGalleries
 *
 *  Large gallery has a letterboxed image with 5 thumbnails down the left side.
 *  Large gallery theme is only loaded when the page has a large gallery.
 * 
 *  Click to show fullscreen gallery with all gallery images.
 *  Go to the fullscreen gallery theme to change fullscreen settings.
 *
  **********************************************
 */

;(function($) {

  var $body = $('body');

  var initLargeGalleries = function() {


    // Set up thumbnail click to change slide
    // --------------------------------------
    $('.lw_gallery_large').each(function() { 
      
      var $this = $(this);
      var $galleryBtns = $this.find('.gallery_btn');
      var $gallerySlides = $this.find('.gallery_slide');

      // only show buttons if there is >1 slide
      if ( $galleryBtns.length !== 1 ) { 
        $this.addClass('has-btns'); 
      }

      // change active slide on thumbnail click
      $body.on('click', '.gallery_btn', function(){
        var $btn = $(this);
        $galleryBtns.removeClass('is-active');
        $gallerySlides.removeClass('is-active');
        $btn.addClass('is-active');
        $btn.prev('.gallery_slide').addClass('is-active');
      });

      // show first slide on page load
      $galleryBtns.first().trigger('click');
    });


    // Set up fullscreen gallery
    // ----------------------------------------------------
    // Load the fullscreen gallery plugin once and cache it
    $.ajax({
      url: '/live/resource/css/_ingredients/themes/global/galleries/fullscreen/fullscreen.js',
      dataType: 'script',
      cache: true
    }).done(function(){

      // If the plugin load is successful, load the fullscreen gallery stylesheet
      $('head').append('<link rel="stylesheet" href="/live/resource/css/_ingredients/themes/global/galleries/fullscreen/fullscreen.css" type="text/css" />');

      $('.lw_gallery_large').each(function() { // for each large gallery on the page
        
        var $this = $(this);

        // Create a fullscreen gallery
        $this.find('.gallery').fsgallery({
          title: $this.find('.gallery_title'), // a text string or jQuery selector containing the gallery title
          imageContainer: $this.find('.gallery_slide'), // a jQuery selector containing each image and image caption 
          caption: $this.find('.gallery_slide_caption'), // a jQuery selector containing each image caption (must be inside imageContainer)
          trigger: $this.find('.gallery_slide_bg'), // jQuery selector that opens fullscreen gallery when clicked (defaults to gallery container)
          width: 1000, // a number denoting the image width. If no width is specified, the original image width will be used.
          autoplay: false, // number of seconds to wait between images, or set to true for default speed (3s). Autoplay will stop when nav buttons are clicked.
          pauseOnHover: true, // pause autoplay when an image is hovered
        });
      });
    });
  };


  // Initialize galleries on window load
  // $(window).on('load', function() {
    initLargeGalleries();
  // });


  // Run after LiveWhale page edit/save
  $body.bind('stopEdit.lw', function(){
    initLargeGalleries();
  });

}(livewhale.jQuery));
