module.exports = (seconds) => {
	const start = new Date().getTime();
	while (new Date().getTime() - start <= seconds * 1000) {}
};
