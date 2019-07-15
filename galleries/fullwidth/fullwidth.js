/**********************************************
 *
 *  Full-Width Gallery
 *  --------------------
 *  On desktop, images are shown in a staggered three-column grid
 *  On mobile, images appear in two sliding rows
 *  The sliders are generated using Swiper https://idangero.us/swiper/
 *  Mobile sliders are hidden on desktop with CSS
 *
  **********************************************
 */

// Kudos to Aaron Kahlhamer
// https://medium.com/@networkaaron/swiper-how-to-destroy-swiper-on-min-width-breakpoints-a947491ddec8


;(function($) {

  var $window = $(window),
      $body = $('body'),
      $galleries = $('.lw_gallery_fullwidth');



  ////////////////////////////////////////////////////////////////////
  // Debounce function from Underscore.js
  // Limits the rate at which function fires
  // use the default option (immediate=false) to trigger on trailing edge
  function debounce(func, wait, immediate) {
      var timeout;
      return function() {
          var context = this, args = arguments;
          var later = function() {
              timeout = null;
              if (!immediate) func.apply(context, args);
          };
          var callNow = immediate && !timeout;
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
          if (callNow) func.apply(context, args);
      };
  }




  ////////////////////////////////////////////////////////////////////
  // Function to setup grid layout and caption styles for desktop

  var initDesktopGrid = function() {

    // array of grid layout classes to assign to each gallery
    var layouts = [ 'layout-1', 'layout-2' ];


    // run this function on each full width gallery on the page
    $galleries.each(function(){

      var $gallery = $(this),
          $grid = $gallery.find('.lw_gallery_fullwidth_grid'),
          $title = $gallery.find('.lw_gallery_fullwidth_title'),
          $figures = $grid.find('figure'),
          $captionBox = $('<li class="caption_box"></li>');

      // assign a random layout class
      $grid.addClass(layouts[ Math.floor( Math.random()*layouts.length ) ]);

      // loop through each gallery image
      $figures.each(function(i) {
        var num = i + 1,
            $this = $(this).addClass('image_'+num);

        // add number to each image
        $this.prepend('<span class="figure_number">'+num+'</span>');

        // clone each image caption into the new caption box
        $this.find('.caption').clone().addClass('image_'+num).prepend('<span class="caption_number">'+num+'</span>&nbsp;').appendTo($captionBox);
      });

      // add title to caption box
      $captionBox.prepend('<h3 class="title">'+$title.text()+'</h3>');

      // add new caption box to the grid
      $captionBox.wrapInner('<div class="inner"></div>').prependTo($grid);


      // function to position grid items in a staggered layout
      var setGridPositions = debounce(function(){

        // loop through grid items and stagger each item below the one above
        var numGridItems = $grid.find('li').length;
        for ( var n = 0; n < numGridItems - 3; n++) {
          var $upperImage = $grid.find('li').eq(n),
              $lowerImage = $grid.find('li').eq(n+3),
              imageGap = $upperImage.offset().top + $upperImage.outerHeight() - $lowerImage.offset().top,
              currentMargin = parseInt($lowerImage.css('margin-top'));

          $lowerImage.css('margin-top', currentMargin + imageGap);
        }
      }, 50, false); // wait for [x]ms before firing

      // layout grid items on DOM load
      setGridPositions();

      // layout grid items again after images load
      $window.on('load', function() {
        setGridPositions();
      });

      // reposition all items after window resize or screen rotation
      $window.on('resize', function() {
        setGridPositions();
      });
    });



    // Then set up gallery events once for all galleries on the page

    // highlight each caption/image when the associated image/caption is hovered/focused
    $body.on('mouseenter', 'figure, .caption', function(){
      var $this = $(this),
          $thisGallery = $this.closest('.lw_gallery_fullwidth');

      if ( $thisGallery && $this.attr('class') ) {
        var imageClass = $this.attr('class').match(/\bimage_(\d+)\b/),
            imageNum = imageClass ? imageClass[1] : false;

        if ( imageNum ) {
          $thisGallery.find('.image_'+imageNum).addClass('is-active');
        }
      }
    });

    $body.on('mouseleave', 'figure, .caption', function(){
      var $this = $(this),
          $thisGallery = $this.closest('.lw_gallery_fullwidth');

      if ( $thisGallery && $this.attr('class') ) {
        var imageClass = $this.attr('class').match(/\bimage_(\d+)\b/),
            imageNum = imageClass ? imageClass[1] : false;

        if ( imageNum ) {
          $thisGallery.find('.image_'+imageNum).removeClass('is-active');
        }
      }
    });

  };





  /////////////////////////////////////////////
  // Function to inject markup for two sliders

  // set flag to indicate whether sliders are set up
  var slidersEnabled = false;

  var initMobileSliders = function() {

    // load the Swiper plugin once and cache it
    $.ajax({
      url: '/_ingredients/plugins/swiper/swiper.js',
      dataType: 'script',
      cache: true
    }).done(function(){ // once Swiper is loaded

      // load the Swiper stylesheet
      $('head').append('<link rel="stylesheet" href="/_ingredients/plugins/swiper/swiper.css" type="text/css" />');

      $galleries.each(function(){ // run function on each fullwidth gallery on the page

        var $gallery = $(this),
            $galleryItems = $gallery.find('li'),
            totalItems = $galleryItems.length,
            minItems = 12;

        // split the gallery into two sliders on mobile if there are more than minItems
        var itemsPerSlider = totalItems > minItems ? Math.floor(totalItems/2) : totalItems;
        var numSliders = totalItems > minItems ? 2 : 1;


        // function to copy gallery item into a slider
        var addSlide = function(i, $container) {
          var $slide = $galleryItems.eq(i).clone();
          $slide.addClass('swiper-slide').css('margin-top', 'unset'); // remove cloned margin
          $container.append($slide);
        };

        // copy gallery items into the appropriate number of sliders
        for ( var n = 1; n <= numSliders; n++) {

          var $swiper = $(`<div class="lw_gallery_fullwidth_slider swiper-container swiper-${n}"></div>`);
          var iStart = (n === 1) ? 0 : itemsPerSlider;
          var iEnd = (n === 1) ? itemsPerSlider : totalItems;

          for (var i = iStart; i < iEnd; i++) {
            addSlide(i, $swiper);
          }

          // add each slider into the existing gallery HTML
          $swiper.wrapInner('<ul class="swiper-wrapper"></ul>').appendTo($gallery);

          // Swiper must be called on each slider separately
          var swiper = new Swiper (`.swiper-${n}`, {
            slidesPerView: 'auto',
            spaceBetween: 10,
            speed: 600,
            freeMode: true,
            freeModeMomentumBounce: false,
            loop: true,
            keyboardControl: true,
            grabCursor: true,
            observeParents: true,
            observer: true // these properties prevent issues where translateX is set incorrectly on load and slider doesnt appear on mobile
          });
        }

        // Prevent galleries being initialized again
        slidersEnabled = true;
      });
    });
  };



  //////////////////////////////////////////////////////////////////
  // Function to check screen size and initialize sliders on mobile
  // sliders are hidden on desktop with CSS

  // choose breakpoint for mobile slider layout
  var breakpoint = window.matchMedia( '(max-width:991px)' );

  var breakpointChecker = function() {
     if ( breakpoint.matches === true && !slidersEnabled ) {
        initMobileSliders();
     }
  };



  ///////////////////////////////////////////////
  // On DOM ready

  // setup gallery grid for desktop
  initDesktopGrid();

  // check the viewport size on load to see if sliders need enabling
  breakpointChecker();

  // then keep an eye on the viewport size
  // uses the addListener() method of the MediaQueryList
  breakpoint.addListener(breakpointChecker);




}(livewhale.jQuery));
