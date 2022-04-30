
class MapPlot {

	constructor(svg_element_id) {
		this.svg = d3.select('#' + svg_element_id);

		// may be useful for calculating scales
		const svg_viewbox = this.svg.node().viewBox.animVal;
		this.svg_width = svg_viewbox.width;
		this.svg_height = svg_viewbox.height;

		// California
		const projection_ca = d3.geoMercator()
			.rotate([0, 0])
			.center([-120, 37])
			.scale(1600)
			.translate([this.svg_width / 4, this.svg_height / 2]) // SVG space
			.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator_ca = d3.geoPath()
			.projection(projection_ca);

		const map_promise_ca = d3.json("https://raw.githubusercontent.com/deldersveld/topojson/master/countries/us-states/CA-06-california-counties.json").then((topojson_raw) => {
			const counties_paths = topojson.feature(topojson_raw, topojson_raw.objects.cb_2015_california_county_20m);
			return counties_paths.features;
		});

		// Texas
		const projection_tx = d3.geoMercator()
			.rotate([0, 0])
			.center([-99, 31])
			.scale(1600)
			.translate([this.svg_width / 2 + this.svg_width / 4, this.svg_height / 2]) // SVG space
			.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator_tx = d3.geoPath()
			.projection(projection_tx);

		const map_promise_tx = d3.json("https://raw.githubusercontent.com/deldersveld/topojson/master/countries/us-states/TX-48-texas-counties.json").then((topojson_raw) => {
			const counties_paths = topojson.feature(topojson_raw, topojson_raw.objects.cb_2015_texas_county_20m);
			return counties_paths.features;
		});

		// USA
		const projection_usa = d3.geoMercator()
			.rotate([0, 0])
			.center([-97, 39])
			.scale(700)
			.translate([this.svg_width / 2, this.svg_height / 2]) // SVG space
			.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator_usa = d3.geoPath()
			.projection(projection_usa);

		const map_promise_usa = d3.json("https://gist.githubusercontent.com/chrispolley/49740980c7d3bdc0b641fe9cb7fa5f01/raw/ef21b721a3bb92c70adee5a2802a63d91826de79/USAdrop1.json").then((topojson_raw) => {
			const states_paths = topojson.feature(topojson_raw, topojson_raw.objects.USAdrop1);
			console.log(states_paths)
			return states_paths.features;
		});

		Promise.all([map_promise_ca, map_promise_tx, map_promise_usa]).then((results) => {
			let map_data_ca = results[0];
			let map_data_tx = results[1];
			let map_data_usa = results[2];

			// Order of creating groups decides what is on top
			//this.map_container_usa = this.svg.append('g');
			this.map_container_ca = this.svg.append('g');
			this.map_container_tx = this.svg.append('g');
		
			// this.map_container_usa.selectAll(".state")
			// 	.data(map_data_usa)
			// 	.enter()
			// 	.append("path")
			// 	.classed("state", true)
			// 	.attr("d", path_generator_usa)
			// 	.style("fill", (d) => {
			// 		if (d.properties.iso_3166_2 == "TX") return "red"
			// 		else if (d.properties.iso_3166_2 == "CA") return "blue"
			// 		else return "white"
			// 	});
				
			this.map_container_ca.selectAll(".county")
				.data(map_data_ca)
				.enter()
				.append("path")
				.classed("county", true)
				.attr("d", path_generator_ca)
				.style("stroke", "black")
				.style("fill", "blue");
			
			this.map_container_tx.selectAll(".county")
			.data(map_data_tx)
			.enter()
			.append("path")
			.classed("county", true)
			.attr("d", path_generator_tx)
			.style("stroke", "black")
			.style("fill", "red");
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
	plot_object = new MapPlot('map-plot');
	// plot object is global, you can inspect it in the dev-console
});
