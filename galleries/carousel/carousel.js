/**********************************************
 *
 *  Carousel Gallery
 *  --------------------
 *  Docs: https://github.com/whitewhale/LWGalleries
 *
 *  Carousel gallery displays a slideshow of images that opens fullscreen when clicked.
 *
 *  Go to the fullscreen gallery to change fullscreen settings.
 *  These gallery styles and scripts are only loaded when there's a gallery on the page.
 *
 *  Auto play without captions:         apply custom class "autoplay"
 *  Show dot navigation:                apply custom class "dots"
 *  Hide captions:                      apply custom class "no-captions"
 *  Hide arrow navigation:              apply custom class "no-arrows"
 *  Hide title:                         apply custom class "no-title"
 *
 *
 *  This gallery uses BoxSlider to display images
 *  Source: BxSlider v4.1.2
 *  Written by: Steven Wanderski, 2014
 *  http://stevenwanderski.com
 *  http://bxslider.com/examples/carousel-dynamic-number-slides
 *
  **********************************************
 */

;(function($) {

  var initCarousels = function () {

    // Load the bxslider plugin once and cache it
    $.ajax({
      url: '/_ingredients/themes/global/galleries/carousel/jquery.bxslider.js',
      dataType: 'script',
      cache: true
    }).done(function(){


      // If the plugin load is successful, set up a carousel for each gallery on the page
      $('.lw_gallery_carousel').each(function() {

        var $gallery = $(this);

        // Once all images have loaded
        $gallery.find('figure img').imagesLoaded().done(function(instance) {

          var autoplay = false,
              speed = 500;

          // Check if autoplay is enabled
          if ($gallery.hasClass('autoplay')) {
            autoplay = true;
            speed = 20000;
          }

          // Set max image height
          var maxImageHeight = 220; // ADJUST THIS NUMBER TO CHANGE THE IMAGE SIZE

          var imageHeights = $gallery.find('img').map(function() {
            return $(this).height();
          }).get();
          var minImageHeight = Math.min.apply(null, imageHeights);

          // Check whether min image height is larger than max height
          var galleryHeight = (minImageHeight > maxImageHeight) ? maxImageHeight : minImageHeight;

          // Set all images to the same height
          $gallery.find('img').height(galleryHeight);

          // Check width of first image using given height
          var firstImage = $(instance.images[0].img),
              firstImageWidth = (firstImage.width()/firstImage.height())*galleryHeight;


          // Create the slider
          var $slider = $gallery.find('.bxslider').bxSlider({
            minSlides: 1,
            maxSlides: 5, // number of images to show at a time
            moveSlides: 1,
            slideWidth: firstImageWidth,
            adaptiveHeight: false,
            slideMargin: 10,
            nextText: '',
            prevText: '',
            ticker: autoplay,
            speed: speed,
            touchEnabled: false, // prevent touch swipe since clicking/dragging/swiping opens gallery fullscreen
            onSliderLoad: function(){

              // Set gallery height
              $gallery.find('.bx-viewport').height(galleryHeight);

              // Set arrow position
              $gallery.find('.bx-controls-direction a').css('top', (galleryHeight/2) );

              // Reveal gallery
              $gallery.css('visibility', 'visible');

            }
          });


          // Set title max width equal to gallery width
          $gallery.find('#lw_gallery_carousel_title').css('max-width', $gallery.find('.bx-wrapper').outerWidth());

        });
      });
    });


    // Then load the fullscreen gallery plugin once and cache it
    $.ajax({
      url: '/live/resource/css/_ingredients/themes/global/galleries/fullscreen/fullscreen.js',
      dataType: 'script',
      cache: true
    }).done(function(){

      // If the plugin load is successful, load the fullscreen gallery stylesheet
      $('head').append('<link rel="stylesheet" href="/live/resource/css/_ingredients/themes/global/galleries/fullscreen/fullscreen.css" type="text/css" />');

      // Then create a fullscreen gallery for each carousel gallery on the page
      $('.lw_gallery_carousel').each(function() {
        var $this = $(this);
        $this.find('.bxslider').fsgallery({
          title: $this.find('#lw_gallery_carousel_title'),     // a text string or jQuery selector containing the gallery title
          caption: $this.find('.caption'),        // a jQuery selector containing each image caption (must be inside list element)
          width: 1000,        // a number denoting the image width. If no width is specified, the original image width will be used.
          autoplay: false,         // number of seconds to wait between images, or set to true for default speed (3s). Autoplay will stop when nav buttons are clicked.
          pauseOnHover: true,  // pause autoplay when an image is hovered
          trigger: $this.find('.lw_image'),     // a jQuery selector for an element that opens the gallery when clicked. By default, the gallery opens when the image container is clicked.
        });
      });
    });
  };

  // Initialize galleries on DOM ready
  initCarousels();

  // And after LiveWhale page edit/save
  $('body').bind('stopEdit.lw', function(){
    initCarousels();
  });

}(livewhale.jQuery));
