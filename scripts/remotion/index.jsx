const React = require('react');
const { registerRoot, Composition } = require('remotion');
const { FiloPromo } = require('./FiloPromo');

function Root() {
  return (
    <>
      <Composition
        id="FiloPromo"
        component={FiloPromo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FiloReels"
        component={FiloPromo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
}

registerRoot(Root);
