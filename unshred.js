
/** 
 * Static implementation of the unshreder
 *
 * @param spec {}
 *
 * @extends {}
 */
var unshred = function(spec, my) {
    my = my || {};
    var _super = {};

    my.SHRED_LENGTH = 32;
    my.IMAGE_WIDTH = 640;
    my.IMAGE_HEIGHT = 359;
    my.SHRED_ID = 'shred';
    my.UNSHRED_ID = 'unshred';

    //public 
    var unshred; //unshred(url): start unshreding, load image
    
    //private
    var process; //process(evt): actual unshreding logic

    var that = {};

    /**
     * First remark, unshreding is non deterministic as a uniform 
     * image would have ~(SHRED_LENGTH / IMAGE_WIDTH)^2 solutions
     * 
     * Therefore I decided to go for a fairly simple solution: 
     * evaluate all N^2 edge to edge distances and reorder along the 
     * N closest viable edges
     * 
     * The distance difference function we use is the one proposed
     * except that it works on BW values
     * 
     * Possible optimization: sum along a random sample of heights 
     * values instead of all pixels
     *      
     * It's funny how far chunks work go (l.130-144), to find the last
     * valid chunk to complete the image... which means that contrary
     * to intuition, in vulgarized words:
     * the validity of the structure drives as much the solution as the 
     * minimization of the edge!
     * 
     * That's why I think there are probably better solutions out there,
     * but at least this one is funny because it's done in JS :)
     */
    var process = function(evt) {
	var img = this;
	var context = document.getElementById(my.SHRED_ID).getContext('2d');
	context.drawImage(img, 0, 0);

	var res = [];

	/**
	 * Calculates the N^2 
	 */
	for(var i = 0; i * my.SHRED_LENGTH < my.IMAGE_WIDTH; i ++) {
	    for(var j = 0; j * my.SHRED_LENGTH < my.IMAGE_WIDTH; j ++) {
		if(i == j) continue; // useless
		var d = 0;
		for(var h = 0; h < my.IMAGE_HEIGHT; h ++) {		    
		    ca = context.getImageData(i * my.SHRED_LENGTH, h, 1, 1).data;
		    cb = context.getImageData((j + 1) * my.SHRED_LENGTH - 1, h, 1, 1).data;
		    
		    bwa = Math.floor(0.3 * ca[0] + 0.59 * ca[1] + 0.11 * ca[2]);
		    bwb = Math.floor(0.3 * cb[0] + 0.59 * cb[1] + 0.11 * cb[2]);
		    d += Math.pow(Math.log((1 + bwa) / 256) - Math.log((1 + bwb) / 256), 2);		    
		}
		res.push({i: i, j: j, v: d});
	    }
	}

	res.sort(function(a,b) { return (a.v - b.v); });

	console.log('shuffling...');

	/**
	 * a chunk is a tuple of shreds. this util function checks if a
	 * chunk A is compatible with chunk B (no repetition, can be merged)
	 */
	var compat = function(chunka, chunkb) {
	    for(var i = 0; i < chunka.length; i++) {
		for(var j = 0; j < chunkb.length; j ++) {
		    if(chunka[i] === chunkb[j]) {
			if(i == (chunka.length-1) && j == 0) continue; //ok
			if(i == 0 && j == (chunkb.length-1)) continue; //ok
			//console.log('compat false');
			return false;
		    }
		}
	    }	    
	    return true;
	};

	/**
	 * merges an array of chunk if some chunks are mergeable
	 * recusrive function that will keep merging until nothing
	 * left to merge!
	 */
	var merge = function(chunks) {
	    //console.log('MERGE: ' + JSON.stringify(chunks));
	    for(var i = 0; i < chunks.length; i++) {
		for(var j = i + 1; j < chunks.length; j ++) {
		    if(chunks[i][0] == chunks[j][chunks[j].length-1]) {
			for(var k = 1; k < chunks[i].length; k++)
			    chunks[j].push(chunks[i][k]);
			chunks.splice(i, 1);
			return merge(chunks);
		    }
		    else if(chunks[i][chunks[i].length-1] == chunks[j][0]) {
			for(var k = 1; k < chunks[j].length; k++)
			    chunks[i].push(chunks[j][k]);
			chunks.splice(j, 1);
			return merge(chunks);			
		    }
		}
	    }
	    return chunks;
	};

	/**
	 * We select the next best possible chunk add it to the chunks array 
	 * and finally attempt to merge chunks before iterating
	 */
	var chunks = [[res[0].j, res[0].i]]; // best chunk so far
	pos = 1;
	while(chunks.length != 1 ||
	      chunks[0].length != my.IMAGE_WIDTH / my.SHRED_LENGTH) {
	    //console.log('POS: ' + pos);
	    var chk = [res[pos].j, res[pos].i];
	    pos++;	    
	    var cmp = true;
	    for(var i = 0; i < chunks.length; i ++) {
		if(!compat(chk, chunks[i])) { cmp = false; break }
	    }
	    if(cmp)
		chunks.push(chk);
	    else
		continue;
	    chunks = merge(chunks);
	}
	
	var chk = chunks[0]; // final result
	
	console.log(JSON.stringify(chk));

	var result = document.getElementById(my.UNSHRED_ID).getContext('2d');
	for(var i = 0; i < chk.length; i ++) {
	    result.putImageData(context.getImageData(chk[i] * my.SHRED_LENGTH, 0, my.SHRED_LENGTH, my.IMAGE_HEIGHT),
				i * my.SHRED_LENGTH, 0);
	}
    };

    /**
     * Starts the unshreding process by cheking that url is an url
     * and firing the image load. When the image is loaded, process
     * is called!
     */ 
    unshred = function(url) {
	if(!/^((https?):(\/\/)+[\w\d:#@%/;$()~_?\+-=\\\.&]*)$/.exec(url))
	    return;
	var img = new Image();
	img.src = url;
        img.onload = process;
    };

    that.unshred = unshred;

    return that;
};



