import twitter from 'twitter-text';
import PDFJSAnnotate from '../';
import initColorPicker from './shared/initColorPicker';

const {
    UI
} = PDFJSAnnotate;
const documentId = 'shared/example.pdf';

import config from '../src/config';

let PAGE_HEIGHT;
let RENDER_OPTIONS = {
    documentId,
    pdfDocument: null,
    scale: parseFloat(localStorage.getItem(`${documentId}/scale`), 10) || 1.33,
    rotate: parseInt(localStorage.getItem(`${documentId}/rotate`), 10) || 0
};

PDFJSAnnotate.setStoreAdapter(new PDFJSAnnotate.LocalStoreAdapter());
PDFJS.workerSrc = './shared/pdf.worker.js';

// Render stuff
let NUM_PAGES = 0;
let renderedPages = [];
let okToRender = false;
let timeout;

document.getElementById('content-wrapper').addEventListener('scroll', function(e) {        

    // clearTimeout(timeout);    
    //  timeout = setTimeout(function() {

        let visiblePageNum = Math.round(e.target.scrollTop / PAGE_HEIGHT) + 1;
        let visiblePage = document.querySelector(`.page[data-page-number="${visiblePageNum}"][data-loaded="false"]`);

        if (renderedPages.indexOf(visiblePageNum) == -1) {
            okToRender = true;
            renderedPages.push(visiblePageNum);
        } else {
            okToRender = false;
        }
        if (visiblePage && okToRender) {
            setTimeout(function() {
                UI.renderPage(visiblePageNum, RENDER_OPTIONS);
            });
        }

    // }, 50);
});

function render() {
    PDFJS.getDocument(RENDER_OPTIONS.documentId).then((pdf) => {
        RENDER_OPTIONS.pdfDocument = pdf;
        let viewer = document.getElementById('viewer');
        viewer.innerHTML = '';

        NUM_PAGES = pdf.pdfInfo.numPages;
        for (let i = 0; i < NUM_PAGES; i++) {
            let page = UI.createPage(i + 1);                        
            viewer.appendChild(page);
        }
        
        // setTimeout(function(){
        //     var doc = new jsPDF('p', 'pt', 'letter')
        //     doc.text(viewer.innerHTML, 10, 10)
        //     doc.save('a4.pdf')            
        // },2000);

        
        UI.renderPage(1, RENDER_OPTIONS).then(([pdfPage, annotations]) => {
            let viewport = pdfPage.getViewport(RENDER_OPTIONS.scale, RENDER_OPTIONS.rotate);
            PAGE_HEIGHT = viewport.height;                        
        });
        
        renderedPages.push(1);
    });
}
render();

// Socket Code Start
var socket = io("http://192.168.1.76:8484/");
var emitingDromServer = false;

(function() {
    
    
    localStorage.removeItem(`${RENDER_OPTIONS.documentId}/tooltype`);    
    socket.on('load old annonation', function(targetObj) {                            
        // console.log(targetObj.annonation);        
        // localStorage.setItem(`${RENDER_OPTIONS.documentId}/annotations`, JSON.stringify(targetObj.annonation));                
        // render();
    });

    //Clear Annonation Socket Code Start
    socket.on("clear annotations", function(targetObj) {
        localStorage.removeItem(`${RENDER_OPTIONS.documentId}/annotations`);
        for (let i = 0; i < NUM_PAGES; i++) {
            let page = document.getElementById(`pageContainer${i+1}`);
            let svg = page.querySelector(config.annotationClassQuery()).innerHTML = "";
            // UI.renderPage(i+1, RENDER_OPTIONS);                        
        }
    });

    //Add Annonation Socket Code Start
    socket.on("add annotations", function(targetObj) {

        PDFJSAnnotate.getStoreAdapter().addAnnotation(
            documentId,
            targetObj.page,
            targetObj
        ).then((annotation) => {            
            if (renderedPages.indexOf(annotation.page) != -1) {
                UI.renderPage(annotation.page, RENDER_OPTIONS).then(([pdfPage, annotations]) => {
                    let viewport = pdfPage.getViewport(RENDER_OPTIONS.scale, RENDER_OPTIONS.rotate);
                    PAGE_HEIGHT = viewport.height;
                });
            }
        }, (error) => {
            console.log(error.message);
        });
    });

    //Delete Annonation Socket Code Start
    socket.on("delete annotations", function(targetObj) {
        PDFJSAnnotate.getStoreAdapter().getAnnotations(documentId, targetObj.page)
            .then((data) => {
                var allAnnonate = data.annotations;
                var filtered = allAnnonate.filter((data) => {
                    return data.i_by == targetObj.uuid;
                });
                if (filtered.length == 0) {
                    filtered = allAnnonate.filter((data) => {
                        return data.uuid == targetObj.uuid;
                    });
                }
                if (filtered.length == 0) {
                    return;
                }
                
                
                
                PDFJSAnnotate.getStoreAdapter().deleteAnnotation(
                    documentId,
                    filtered[0].uuid
                ).then(() => {                    
                    if (renderedPages.indexOf(targetObj.page) != -1){
                        let page = document.getElementById(`pageContainer${targetObj.page}`);
                        let svg = page.querySelector(config.annotationClassQuery()).innerHTML = "";                                                
                        UI.renderPage(targetObj.page, RENDER_OPTIONS);
                    }                    
                }, (error) => {
                    console.log(error.message);
                });

            }, (error) => {
                console.log(error.message);
            });
    });


    //Edit Annonation Socket Code Start
    socket.on("edit annotations", function(targetObj) {

        

        emitingDromServer = true

        function updateCallback(update_uuid, dataObject) {
            PDFJSAnnotate.getStoreAdapter().editAnnotation(documentId, update_uuid, dataObject).then((rannotation) => {
                setTimeout(function() {
                    emitingDromServer = false;
                }, 1000);
            }, (error) => {
                console.log(error.message);
            });

            if (renderedPages.indexOf(targetObj.page) != -1) {
                let page = document.getElementById(`pageContainer${targetObj.page}`);
                let svg = page.querySelector(config.annotationClassQuery()).innerHTML = "";
                UI.renderPage(targetObj.page, RENDER_OPTIONS);
            }

        }


        if (targetObj.inNotParent) {
                        
            PDFJSAnnotate.getStoreAdapter().getAnnotations(documentId, targetObj.page)
                .then((data) => {
                    var allAnnonate = data.annotations;
                    var filtered = allAnnonate.filter((data) => {
                        return data.uuid == targetObj.i_by;
                    });
                    if (filtered.length == 0) {
                        return;
                    }                    
                    targetObj.uuid = filtered[0].uuid;
                    targetObj.inNotParent = false;
                    
                    updateCallback(filtered[0]['uuid'], targetObj)

                }, (error) => {
                    console.log(error.message);
                });
        } else {
            PDFJSAnnotate.getStoreAdapter().getAnnotations(documentId, targetObj.page)
                .then((data) => {
                    var allAnnonate = data.annotations;
                    var filtered = allAnnonate.filter((data) => {
                        return data.i_by == targetObj.uuid;
                    });
                    if (filtered.length == 0) {
                        return;
                    }
                    targetObj.i_by = filtered[0]['i_by'];
                    targetObj.inNotParent = true;

                    updateCallback(filtered[0]['uuid'], targetObj)

                }, (error) => {
                    console.log(error.message);
                });
        }
    });
})();


// Hotspot color stuff
(function() {
    let hotspotColor = localStorage.getItem(`${RENDER_OPTIONS.documentId}/hotspot/color`) || 'darkgoldenrod';
    let currentTarget = undefined;

    function handleAnnotationClick(target) {

        let type = target.getAttribute('data-pdf-annotate-type');
        if (['fillcircle', 'arrow'].indexOf(type) === -1) {
            return; // nothing to do
        }
        currentTarget = target;
        hotspotColor = currentTarget.getAttribute('stroke');

        UI.setArrow(10, hotspotColor);
        UI.setCircle(10, hotspotColor);

        let a = document.querySelector('.hotspot-color .color');
        if (a) {
            a.setAttribute('data-color', hotspotColor);
            a.style.background = hotspotColor;
        }
    }

    function handleAnnotationBlur(target) {

        if (currentTarget === target) {
            currentTarget = undefined;
        }
    }

    initColorPicker(document.querySelector('.hotspot-color'), hotspotColor, function(value) {
        if (value === hotspotColor) {
            return; // nothing to do     
        }
        localStorage.setItem(`${RENDER_OPTIONS.documentId}/hotspot/color`, value);
        hotspotColor = value;

        UI.setArrow(10, hotspotColor);
        UI.setCircle(10, hotspotColor);

        if (!currentTarget) {
            return; // nothing to do
        }

        let type = currentTarget.getAttribute('data-pdf-annotate-type');
        let annotationId = currentTarget.getAttribute('data-pdf-annotate-id');
        if (['fillcircle', 'arrow'].indexOf(type) === -1) {
            return; // nothing to do
        }

        // update target
        currentTarget.setAttribute('stroke', hotspotColor);
        currentTarget.setAttribute('fill', hotspotColor);

        // update annotation
        PDFJSAnnotate.getStoreAdapter().getAnnotation(documentId, annotationId).then((annotation) => {
            annotation.color = hotspotColor;
            PDFJSAnnotate.getStoreAdapter().editAnnotation(documentId, annotationId, annotation);
        });
    });

    UI.addEventListener('annotation:click', handleAnnotationClick);
    UI.addEventListener('annotation:blur', handleAnnotationBlur);
})();

// Text stuff
(function() {
    let textSize;
    let textColor;

    function initText() {
        let size = document.querySelector('.toolbar .text-size');
        [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96].forEach((s) => {
            size.appendChild(new Option(s, s));
        });

        setText(
            localStorage.getItem(`${RENDER_OPTIONS.documentId}/text/size`) || 10,
            localStorage.getItem(`${RENDER_OPTIONS.documentId}/text/color`) || '#000000'
        );

        initColorPicker(document.querySelector('.text-color'), textColor, function(value) {
            setText(textSize, value);
        });
    }

    function setText(size, color) {
        let modified = false;

        if (textSize !== size) {
            modified = true;
            textSize = size;
            localStorage.setItem(`${RENDER_OPTIONS.documentId}/text/size`, textSize);
            document.querySelector('.toolbar .text-size').value = textSize;
        }

        if (textColor !== color) {
            modified = true;
            textColor = color;
            localStorage.setItem(`${RENDER_OPTIONS.documentId}/text/color`, textColor);

            let selected = document.querySelector('.toolbar .text-color.color-selected');
            if (selected) {
                selected.classList.remove('color-selected');
                selected.removeAttribute('aria-selected');
            }

            selected = document.querySelector(`.toolbar .text-color[data-color="${color}"]`);
            if (selected) {
                selected.classList.add('color-selected');
                selected.setAttribute('aria-selected', true);
            }

        }

        if (modified) {
            UI.setText(textSize, textColor);
        }
    }

    function handleTextSizeChange(e) {
        setText(e.target.value, textColor);
    }

    document.querySelector('.toolbar .text-size').addEventListener('change', handleTextSizeChange);
    initText();
})();

// Pen stuff
(function() {
    let penSize;
    let penColor;

    function initPen() {
        let size = document.querySelector('.toolbar .pen-size');
        for (let i = 0; i < 20; i++) {
            size.appendChild(new Option(i + 1, i + 1));
        }

        setPen(
            localStorage.getItem(`${RENDER_OPTIONS.documentId}/pen/size`) || 1,
            localStorage.getItem(`${RENDER_OPTIONS.documentId}/pen/color`) || '#000000'
        );

        initColorPicker(document.querySelector('.pen-color'), penColor, function(value) {
            setPen(penSize, value);
        });
    }

    function setPen(size, color) {

        let modified = false;
        if (penSize !== size) {
            modified = true;
            penSize = size;
            localStorage.setItem(`${RENDER_OPTIONS.documentId}/pen/size`, penSize);
            document.querySelector('.toolbar .pen-size').value = penSize;
        }

        if (penColor !== color) {
            modified = true;
            penColor = color;
            localStorage.setItem(`${RENDER_OPTIONS.documentId}/pen/color`, penColor);

            let selected = document.querySelector('.toolbar .pen-color.color-selected');
            if (selected) {
                selected.classList.remove('color-selected');
                selected.removeAttribute('aria-selected');
            }

            selected = document.querySelector(`.toolbar .pen-color[data-color="${color}"]`);
            if (selected) {
                selected.classList.add('color-selected');
                selected.setAttribute('aria-selected', true);
            }
        }

        if (modified) {
            UI.setPen(penSize, penColor);
        }
    }

    function handlePenSizeChange(e) {
        setPen(e.target.value, penColor);
    }

    document.querySelector('.toolbar .pen-size').addEventListener('change', handlePenSizeChange);

    initPen();
})();

// Toolbar buttons
(function() {
    let tooltype = localStorage.getItem(`${RENDER_OPTIONS.documentId}/tooltype`) || 'cursor';
    if (tooltype) {
        setActiveToolbarItem(tooltype, document.querySelector(`.toolbar button[data-tooltype=${tooltype}]`));
    }

    function setActiveToolbarItem(type, button) {
        let active = document.querySelector('.toolbar button.active');
        if (active) {
            active.classList.remove('active');

            switch (tooltype) {
                case 'cursor':
                    UI.disableEdit();
                    break;
                case 'draw':
                    UI.disablePen();
                    break;
                case 'arrow':
                    UI.disableArrow();
                    break;
                case 'text':
                    UI.disableText();
                    break;
                case 'point':
                    UI.disablePoint();
                    break;
                case 'area':
                case 'highlight':
                case 'strikeout':
                    UI.disableRect();
                    break;
                case 'circle':
                case 'emptycircle':
                case 'fillcircle':
                    UI.disableCircle();
                    break;
            }
        }

        if (button) {
            button.classList.add('active');
        }
        if (tooltype !== type) {
            localStorage.setItem(`${RENDER_OPTIONS.documentId}/tooltype`, type);
        }
        tooltype = type;


        switch (type) {
            case 'cursor':
                UI.enableEdit();
                break;
            case 'draw':
                UI.enablePen();
                break;
            case 'arrow':
                UI.enableArrow();
                break;
            case 'text':
                UI.enableText();
                break;
            case 'point':
                UI.enablePoint();
                break;
            case 'area':
            case 'highlight':
            case 'strikeout':
                UI.enableRect(type);
                break;
            case 'circle':
            case 'emptycircle':
            case 'fillcircle':
                UI.enableCircle(type);
                break;
        }
    }

    function handleToolbarClick(e) {
        if (e.target.nodeName === 'BUTTON') {
            setActiveToolbarItem(e.target.getAttribute('data-tooltype'), e.target);

        }
    }

    document.querySelector('.toolbar').addEventListener('click', handleToolbarClick);
})();

// Scale/rotate
(function() {
    function setScaleRotate(scale, rotate) {

        scale = parseFloat(scale, 10);
        rotate = parseInt(rotate, 10);

        if (RENDER_OPTIONS.scale !== scale || RENDER_OPTIONS.rotate !== rotate) {
            RENDER_OPTIONS.scale = scale;
            RENDER_OPTIONS.rotate = rotate;
            
            
            localStorage.setItem(`${RENDER_OPTIONS.documentId}/scale`, RENDER_OPTIONS.scale);
            localStorage.setItem(`${RENDER_OPTIONS.documentId}/rotate`, RENDER_OPTIONS.rotate % 360);

            render();
        }
    }

    function handleScaleChange(e) {

        setScaleRotate(e.target.value, RENDER_OPTIONS.rotate);
    }

    function handleRotateCWClick() {
        setScaleRotate(RENDER_OPTIONS.scale, RENDER_OPTIONS.rotate + 90);
    }

    function handleRotateCCWClick() {
        setScaleRotate(RENDER_OPTIONS.scale, RENDER_OPTIONS.rotate - 90);
    }
    document.querySelector('.toolbar select.scale').value = RENDER_OPTIONS.scale;
    document.querySelector('.toolbar select.scale').addEventListener('change', handleScaleChange);
    document.querySelector('.toolbar .rotate-ccw').addEventListener('click', handleRotateCCWClick);
    document.querySelector('.toolbar .rotate-cw').addEventListener('click', handleRotateCWClick);

})();

// Clear toolbar button
(function() {
    function handleClearClick(e) {
        if (confirm('Are you sure you want to clear annotations?')) {
            for (let i = 0; i < NUM_PAGES; i++) {
                document.querySelector(`div#pageContainer${i+1} svg.annotationLayer`).innerHTML = '';
            }
            socket.emit('clear annotations', "clear");
            localStorage.removeItem(`${RENDER_OPTIONS.documentId}/annotations`);
            localStorage.removeItem(`${RENDER_OPTIONS.documentId}/annotations-back`);

        }
    }
    document.querySelector('a.clear').addEventListener('click', handleClearClick);
})();

// Comment stuff
(function(window, document) {
    let commentList = document.querySelector('#comment-wrapper .comment-list-container');
    let commentForm = document.querySelector('#comment-wrapper .comment-list-form');
    let commentText = commentForm.querySelector('input[type="text"]');

    function supportsComments(target) {

        let type = target.getAttribute('data-pdf-annotate-type');
        return ['point', 'highlight', 'area'].indexOf(type) > -1;
    }

    function insertComment(comment) {

        let child = document.createElement('div');
        child.className = 'comment-list-item';
        child.innerHTML = twitter.autoLink(twitter.htmlEscape(comment.content));

        commentList.appendChild(child);
    }

    function handleAnnotationClick(target) {
        if (supportsComments(target)) {
            let documentId = target.parentNode.getAttribute('data-pdf-annotate-document');
            let annotationId = target.getAttribute('data-pdf-annotate-id');
            PDFJSAnnotate.getStoreAdapter().getComments(documentId, annotationId).then((comments) => {
                commentList.innerHTML = '';
                commentForm.style.display = '';
                commentText.focus();
                commentForm.onsubmit = function() {
                    PDFJSAnnotate.getStoreAdapter().addComment(documentId, annotationId, commentText.value.trim())
                        .then(insertComment)
                        .then(() => {
                            commentText.value = '';
                            commentText.focus();
                        });
                    return false;
                };
                comments.forEach(insertComment);
            });
        }
    }

    function handleAnnotationBlur(target) {
        if (supportsComments(target)) {
            commentList.innerHTML = '';
            commentForm.style.display = 'none';
            commentForm.onsubmit = null;
            insertComment({
                content: 'No comments'
            });
        }
    }

    UI.addEventListener('annotation:click', handleAnnotationClick);
    UI.addEventListener('annotation:blur', handleAnnotationBlur);


    UI.addEventListener('annotation:add', (documentId, pageNumber, annotation) => {
        let annotations = localStorage.getItem(`${RENDER_OPTIONS.documentId}/annotations`) || [];
        localStorage.setItem(`${RENDER_OPTIONS.documentId}/annotations-back`, annotations)
        if (annotation.inNotParent) {
            annotation.inNotParent = false;
            return;
        }
        socket.emit('add annotations', annotation);
    });

    UI.addEventListener('annotation:edit', (documentId, annotationId, annotation) => {
        let annotations = localStorage.getItem(`${RENDER_OPTIONS.documentId}/annotations`) || [];
        localStorage.setItem(`${RENDER_OPTIONS.documentId}/annotations-back`, annotations)
        if (!emitingDromServer) {
            socket.emit('edit annotations', annotation);
        }        
    });

    UI.addEventListener('annotation:delete', (documentId, annotationId) => {
        var oldAnnotations = JSON.parse(localStorage.getItem(`${RENDER_OPTIONS.documentId}/annotations-back`) || []);        
        var deletedAnnonate_obj = oldAnnotations.filter((data) => {
            return data.uuid == annotationId;
        });
        var i_by = annotationId;
        var page = 1;        
        if (deletedAnnonate_obj.length > 0) {
            if (deletedAnnonate_obj[0].inNotParent) {
                i_by = deletedAnnonate_obj[0].i_by;
            }
            page = deletedAnnonate_obj[0].page;
        }
        var obj = {
            'uuid': i_by,
            'documentId': documentId,
            'is_deleted': true,
            "i_by": i_by,
            "page": page,
        }
        socket.emit('delete annotations', obj);
    });

    UI.setArrow(10, 'darkgoldenrod');
    UI.setCircle(10, 'darkgoldenrod')
})(window, document);


document.querySelector('#download').addEventListener('click', handleDownloadClick);
      function handleDownloadClick(){
          
        let annotations = localStorage.getItem(`${RENDER_OPTIONS.documentId}/annotations`) || [];                
        
        $("#input-annotate").val(annotations);
        $("#download-button").trigger( "click" );

        //   $.post("/download",
        //   {
        //       'annotations': annotations,                            
        //   },
        //   function(data, status){              
        //       window.open("http://192.168.1.76:8484/shared/example14.pdf")
        //   });

      }