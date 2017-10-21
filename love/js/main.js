$(document).ready(function(){
	var photos=[];
	for(var i=0;i<35;i++){
		photos.push("images\/memory-"+i+'.jpg');
	}
	$('li').find('img').attr('src',function(index,oldval){
		return photos[index];
	})
	$('.love').mouseover(function(){
		$(this).css('opacity','1');
		$('.title').css('display','none');
		$('.all-mask').css({
			'display':'none',
			'opacity':'0'
		});
	}).mouseout(function(){
		$(this).css('opacity','.5');
		$('.title').css('display','block');
		$('.all-mask').css({
			'display':'block',
			'opacity':'0.8'
		});
	})

	$('li').mouseover(function(){
		$(this).find('img').css({
			'transform':'scale(1.1,1.1)',
		})
		$(this).find('.mask').css({
			'opacity':'0',
			'transform':'scale(1.2,1.2)'
		});
	}).mouseout(function(){
		$(this).find('img').css({
			'transform':'scale(1,1)',
		})
		$(this).find('.mask').css({
			'opacity':'0.9',
			'transform':'scale(1,1)'
		});
	})
})