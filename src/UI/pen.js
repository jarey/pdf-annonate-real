import PDFJSAnnotate from '../PDFJSAnnotate';
import { appendChild } from '../render/appendChild';
import {
  disableUserSelect,
  enableUserSelect,
  findSVGAtPoint,
  getMetadata,
  convertToSvgPoint
} from './utils';


let _enabled = false;
let _penSize;
let _penColor;
let path;
let lines;


var lastMove = null;

function handleTouchStart(event) {    
    lastMove = event;
    path = null;
    lines = [];
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
};

function handleTouchMove(event) {
    lastMove = event;
    // event.preventDefault();    
    if (event.touches.length > 0) {
        var e = event.touches[0];
        savePoint(e.clientX, e.clientY);
    }
};


function handleTouchEnd(event) {
  
    
    if (lastMove && lastMove.touches.length > 0) {
        var e = lastMove.touches[0];
        var svg = void 0;
                
        if (lines.length > 1 && (svg = (0, findSVGAtPoint)(e.clientX, e.clientY))) {
            var _getMetadata = (0, getMetadata)(svg);

            var documentId = _getMetadata.documentId;
            var pageNumber = _getMetadata.pageNumber;


            PDFJSAnnotate.getStoreAdapter().addAnnotation(documentId, pageNumber, {
                type: 'drawing',
                width: _penSize,
                color: _penColor,
                lines: lines
            }).then(function(annotation) {
                if (path) {
                    svg.removeChild(path);
                }
                appendChild(svg, annotation);
            });
        }
    }
    lastMove = null;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
};




/**
 * Handle document.mousedown event
 */
function handleDocumentMousedown() {
  path = null;
  lines = [];

  document.addEventListener('mousemove', handleDocumentMousemove);
  document.addEventListener('mouseup', handleDocumentMouseup);
}

/**
 * Handle document.mouseup event
 *
 * @param {Event} e The DOM event to be handled
 */
function handleDocumentMouseup(e) {
  let svg;
  if (lines.length > 1 && (svg = findSVGAtPoint(e.clientX, e.clientY))) {
    let { documentId, pageNumber } = getMetadata(svg);

    PDFJSAnnotate.getStoreAdapter().addAnnotation(documentId, pageNumber, {
        type: 'drawing',
        width: _penSize,
        color: _penColor,
        lines
      }
    ).then((annotation) => {
      if (path) {
        svg.removeChild(path);
      }

      appendChild(svg, annotation);
    });
  }

  document.removeEventListener('mousemove', handleDocumentMousemove);
  document.removeEventListener('mouseup', handleDocumentMouseup);
}

/**
 * Handle document.mousemove event
 *
 * @param {Event} e The DOM event to be handled
 */
function handleDocumentMousemove(e) {
  savePoint(e.clientX, e.clientY);
}

/**
 * Handle document.keyup event
 *
 * @param {Event} e The DOM event to be handled
 */
function handleDocumentKeyup(e) {
  // Cancel rect if Esc is pressed
  if (e.keyCode === 27) {
    lines = null;
    path.parentNode.removeChild(path);
    document.removeEventListener('mousemove', handleDocumentMousemove);
    document.removeEventListener('mouseup', handleDocumentMouseup);
  }
}

/**
 * Save a point to the line being drawn.
 *
 * @param {Number} x The x coordinate of the point
 * @param {Number} y The y coordinate of the point
 */
function savePoint(x, y) {
  let svg = findSVGAtPoint(x, y);
  if (!svg) {
    return;
  }

  let rect = svg.getBoundingClientRect();
  let point = convertToSvgPoint([
    x - rect.left,
    y - rect.top
  ], svg);

  lines.push(point);

  if (lines.length <= 1) {
    return;
  }

  if (path) {
    svg.removeChild(path);
  }

  path = appendChild(svg, {
    type: 'drawing',
    color: _penColor,
    width: _penSize,
    lines
  });
}

/**
 * Set the attributes of the pen.
 *
 * @param {Number} penSize The size of the lines drawn by the pen
 * @param {String} penColor The color of the lines drawn by the pen
 */
export function setPen(penSize = 1, penColor = '000000') {
  _penSize = parseInt(penSize, 10);
  _penColor = penColor;
}

/**
 * Enable the pen behavior
 */
export function enablePen() {

  $('#content-wrapper').css('overflow-y', 'hidden');
  $('#content-wrapper').css('overflow-x', 'hidden');
  $('#content-wrapper').css('-webkit-overflow-scrolling', 'none');

  if (_enabled) { return; }

  _enabled = true;
  document.addEventListener('mousedown', handleDocumentMousedown);  
  document.addEventListener('keyup', handleDocumentKeyup);    

  document.addEventListener('touchstart', handleTouchStart, false);
  
  disableUserSelect();
}

/**
 * Disable the pen behavior
 */
export function disablePen() {
  
  $('#content-wrapper').css('overflow-y', 'scroll');
  $('#content-wrapper').css('overflow-x', 'scroll');
  $('#content-wrapper').css('-webkit-overflow-scrolling', 'touch');

  if (!_enabled) { return; }

  _enabled = false;
  document.removeEventListener('mousedown', handleDocumentMousedown);

  document.removeEventListener('keyup', handleDocumentKeyup);

  document.removeEventListener('touchstart', handleTouchStart);
  
  
  enableUserSelect();
}

