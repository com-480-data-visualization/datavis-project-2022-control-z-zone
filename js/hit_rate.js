class ScatterPlot {

	
	constructor(svg_element_id) {
		this.svg = d3.select('#' + svg_element_id);
		
		const viz = "race"

		const data_path = (viz == "race") ? "data/city/all_hit_rate_ethnicity_mean.csv" : "data/city/all_hit_rate_gender_mean.csv"

		const hit_rate_promise = d3.csv(data_path).then((data) => {
			return data
		})

		const color_choices = {
			"white" : "steelblue",
			"black" : "firebrick",
			"asian/pacific islander" :  "goldenrod",
			"hispanic" : "MediumAquaMarine"
		}

		
		Promise.all([hit_rate_promise]).then((results) => {

			let hit_rate = results[0];
			
			var counties_id_hit_rate_ca = []
			var counties_id_hit_rate_tx = []
			var total_arrest = []
			var label = []
			var dates = [...new Set(hit_rate.map(x=> parseInt(x.year)))].sort() //get all dates

			if (viz == "race") {
				hit_rate.filter(x => (x.year == dates[0] && x.County == 'ca')).forEach((row) => { // x.subject_race == choices[0] &&
					counties_id_hit_rate_ca.push((parseFloat(row.mean)))
					total_arrest.push((parseFloat(row.sum)))
					label.push(row.subject_race)
				})
				hit_rate.filter(x => (x.year == dates[0] &&  x.County == 'tx' )).forEach((row) => {// x.subject_race == choices[0] &&
					counties_id_hit_rate_tx.push((parseFloat(row.mean)))
				})
			 } else {
			 	hit_rate.filter(x => (x.year == dates[0]) && x.subject_sex == choices[0]).forEach((row) => {
			 		counties_id_hit_rate.push((parseFloat(row.mean)))
			 		total_arrest.push((parseFloat(row.sum)))
			 	})
			 }
			

			let data_ca = counties_id_hit_rate_ca.map((value, index) => {
				return {'index': index, 'y': value, 'x' :  counties_id_hit_rate_tx[index], 'r' : total_arrest[index], 'label' : label[index]};
			});
			
			this.plot_area = this.svg.append('g')
			 .attr('x', 10)
			 .attr('y',  10); 

			this.plot_area.append('rect')
			 .classed('plot-background', true)
			 .attr('width', this.svg.width)
			 .attr('height', this.svg.height)
			 .attr("fill", 'transparent');
			
			var hit_margin = {top: 0, right: 20, bottom: 20, left: 0};

			//get dimension of the svg
			const svg_hit_viewbox = this.svg.node().viewBox.animVal;
			const svg_hit_width = svg_hit_viewbox.width - hit_margin.left - hit_margin.right;
			const svg_hit_height = svg_hit_viewbox.height  - hit_margin.top - hit_margin.bottom;

			const x_value_range = [0, 40];//d3.min(data_ca, d => d.x)  d3.max(data_ca, d => d.x)

			//const y_value_range = [0, d3.max(data_ca, d => d.y)];
			const y_value_range = [0, 40];

			const x_shift = svg_hit_width * 1/4

			const pointX_to_svgX = d3.scaleLinear()
			 	.domain(x_value_range)
			 	.range([0, svg_hit_width / 2]);

			const pointY_to_svgY = d3.scaleLinear()
			 	.domain(y_value_range)
			 	.range([svg_hit_height, 0]);
				
			var myColor = d3.scaleOrdinal()
						.domain(label)
						.range(d3.schemeSet1);

			var map_hit = this.plot_area.selectAll("circle")
			  	.data(data_ca)
			  	.enter()
			  	.append("circle")
				.attr("class", function(d) { return "bubbles " + d.label})
				.attr("cx", d =>  pointX_to_svgX(d.x|| 0)) // position, rescaled 
				.attr("cy", d => pointY_to_svgY(d.y|| 0)) //
				.attr("r", d => d.r *0.002)
				.style("fill", function (d) { return color_choices[d.label]; } )
				.attr("transform", "translate(" + x_shift + ", " + 0 + ")");
			//  		.classed('cold', d => d.y <= 17) // color classes
			//  		.classed('warm', d => d.y >= 23);
			

			var size = 2

			var highlight = function(d){
				// reduce opacity of all groups
				d3.selectAll(".bubbles").style("opacity", .05)
				// expect the one that is hovered
				d3.selectAll("."+d).style("opacity", 1)
			}

			var noHighlight = function(d){
				d3.selectAll(".bubbles").style("opacity", 1)
			}

			this.svg.selectAll("bubble")
				.data(label)
				.enter()
				.append("circle")
				.attr("cx", 105)
				.attr("cy", function(d,i){ return 15 + i*(size+5)}) 
				.attr("r", 1)
				.style("fill", function(d){ return color_choices[d]})
				.on("mouseover", highlight)
				.on("mouseleave", noHighlight)
				.attr("transform", "translate(" + x_shift + ", " + 0 + ")");
			
			this.svg.selectAll("legend")
				.data(label)
				.enter()
				.append("text")
				.classed("legend", true)
				.attr("x", 178)
				.attr("y", function(d, i){ return 16 + i*(size+5);})
				.text(function(d, i) {return d})
				.style("font-size", "4px")


			// // Create Y labels
			const label_ys = Array.from(Array(6), (elem, index) => 20 * index); // 0 20 40 ... 180

			var axis_y = this.svg.append('g')
				.selectAll('text')
				.data(label_ys)
				.enter()
				.append('text')
				.text( svg_y => pointY_to_svgY.invert(svg_y).toFixed(1) )//
				.attr('x', -5)
				.attr('y', svg_y => svg_y + 1)
				.attr("transform", "translate(" + x_shift + ", " + 0 + ")");

			var axis_x = this.svg.append('g')
				.selectAll('text')
				.data(label_ys)
				.enter()
				.append('text')
				.text( svg_x => pointX_to_svgX.invert(svg_x).toFixed(1))//
				.attr('x', svg_x => svg_x + 1)
				.attr('y', 105)
				.attr("transform", "translate(" + x_shift + ", " + 0 + ")");
			

			this.svg.append('line')
				.style("stroke", "black")
				.style("stroke-width", 0.5)
				.style("opacity", 0.5)
				.style("stroke-dasharray", ("3, 3"))
				.attr("x1", 0)
				.attr("y1", svg_hit_height)
				.attr("x2", svg_hit_width / 2)
				.attr("y2", 0)
				.attr("transform", "translate(" + x_shift + ", " + 0 + ")");

			function updatePlotData(date) {

				var counties_id_hit_rate_ca = []
				var counties_id_hit_rate_tx = []
				var total_arrest = []
				var label = []
				if (viz == "race") {
					hit_rate.filter(x => (x.year == date && x.County == 'ca')).forEach((row) => { // x.subject_race == choices[0] &&
						counties_id_hit_rate_ca.push((parseFloat(row.mean)))
						total_arrest.push((parseFloat(row.sum)))
						
						label.push(row.subject_race)
					})
					hit_rate.filter(x => (x.year == date &&  x.County == 'tx')).forEach((row) => {// x.subject_race == choices[0] &&
						counties_id_hit_rate_tx.push((parseFloat(row.mean)))
					})
				} else {
					hit_rate.filter(x => (x.year == date) ).forEach((row) => {
						counties_id_hit_rate.push((parseFloat(row.mean)))
						total_arrest.push((parseFloat(row.sum)))
	
					})
				}
				

				data_ca = counties_id_hit_rate_ca.map((value, index) => {
					return {'index': index, 'y': value, 'x' :  counties_id_hit_rate_tx[index], 'r' : total_arrest[index], 'label' : label[index]};
				});

				map_hit
			  	.data(data_ca)
				.transition()
				.duration(500)
				.attr("cx", d => pointX_to_svgX(d.x|| 0) ) // position, rescaled
				.attr("cy", d => pointY_to_svgY(d.y|| 0))
				.attr("r", d => d.r *0.002)
			}
			
			function update(pos) {

				//move circle
				handle.attr("cx", x(pos));

				//update the slider text
				label_slider
					.attr("x", x(pos))
					.text(Math.floor(pos));

				var date = Math.floor(pos); //get date from slider pos

				updatePlotData(date)
				
			}

			//---------- SLIDER ----------//
			
			var startDate = dates[0];
			var endDate = dates[dates.length - 1];

			console.log(startDate)

			var slider_margin = {top:0, right:50, bottom:0, left:50};

			var slider_svg = d3.select('#slider3');

			const svg_slider_viewbox = slider_svg.node().viewBox.animVal;
			const svg_slider_width = svg_slider_viewbox.width - slider_margin.left - slider_margin.right;
			const svg_slider_height = svg_slider_viewbox.height  - slider_margin.top - slider_margin.bottom;

			var moving_b = false; //if slider is moving
			var currentValue = 0; //slider value
			var targetValue = svg_slider_width;
			var timer = 0;

			var playButton = d3.select("#play-button-hit")

			function step() {

				update(x.invert(currentValue));

				currentValue = currentValue + (targetValue/100);

				if (currentValue > targetValue) {
					moving_b = false;
					update(x.invert(currentValue));
					clearInterval(timer);
					playButton.text("Play");
				}
			}

			playButton
				.on("click", function() {
					var button = d3.select(this);
					if (button.text() == "Pause") {
						moving_b = false;
						clearInterval(timer);
						button.text("Play");
					} else {
						moving_b = true;
						currentValue = 0;
						timer = setInterval(step, 150); //call step() each 100ms
						button.text("Pause");
					}
				});

			var x = d3.scaleLinear()
					.domain([startDate, endDate])
					.range([0, svg_slider_width])
					.clamp(true);
		
			var slider = slider_svg.append("g")
					.attr("class", "slider")
					.attr("transform", "translate(" + slider_margin.left + "," + svg_slider_height/2 + ")");

			// slider line
			slider.append("line")
				.attr("class", "track")
				.attr("x1", x.range()[0])
				.attr("x2", x.range()[1])
				.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
				.attr("class", "track-inset")
				.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
				.attr("class", "track-overlay")
				.call(d3.drag()
					.on("start.interrupt", function() { slider.interrupt(); })
					.on("start drag", function() {
						currentValue = d3.event.x;
						update(x.invert(currentValue))
					})
				);

			slider.insert("g", ".track-overlay")
				.attr("class", "ticks")
				.attr("transform", "translate(0," + 18 + ")")
				.selectAll("text")
				.data(x.ticks(8))
				.enter()
				.append("text")
				.attr("fill", "CurrentColor")
				.attr("x", x)
				.attr("y", 10)
				.attr("text-anchor", "middle")
				.style("font-size", "15px")
				.text(function(d) { return d; });

			//text slider
			var label_slider = slider.append("text")
				.attr("class", "label")
				.attr("text-anchor", "middle")
				.text(startDate)
				.attr("fill", "CurrentColor")
				.style("font-size", "15px")
				.attr("transform", "translate(0," + (-25) + ")")

			//circle slider
			var handle = slider.insert("circle", ".track-overlay")
				.attr("class", "handle")
				.attr("r", 12);
		});

	}
	
}

function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

whenDocumentLoaded(() => {

	let plot = new ScatterPlot('plot');

});