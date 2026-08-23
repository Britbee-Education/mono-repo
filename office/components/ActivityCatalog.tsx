import { PHONICS, PHONICS_GROUPS, dailyPhonics, phonicsForOffset } from "@/lib/content/phonics";
import { STORY } from "@/lib/content/story";
import { VERB_POOL, weeklyVerbs } from "@/lib/content/verbs";
import { PREPOSITIONS } from "@/lib/content/prepositions";
import type { ActivityId } from "@/lib/activities";

export function ActivityCatalog({ id }: { id: ActivityId }) {
  if (id === "phonics") return <PhonicsCatalog />;
  if (id === "sentence") return <SentenceCatalog />;
  if (id === "story") return <StoryCatalog />;
  if (id === "verbs") return <VerbsCatalog />;
  return <PrepCatalog />;
}

function PhonicsCatalog() {
  return (
    <div className="catalog">
      <p className="lead" style={{ marginBottom: 16 }}>
        Exact order in the kids app. Groups stay locked until the child masters 2 sounds in the previous group. Each
        sound is coached as: hear the phoneme, then say beginning / middle / end words.
      </p>
      {PHONICS_GROUPS.map((group, gi) => {
        const sounds = PHONICS.filter((s) => s.group === group.id);
        return (
          <section key={group.id} className="catalog-block">
            <h3>
              Group {gi + 1}. {group.label}
              <span className="chip" style={{ marginLeft: 8 }}>
                {sounds.length} sounds
              </span>
            </h3>
            <div className="table-wrap">
              <table className="sheet">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Sound</th>
                    <th>Cue the child hears</th>
                    <th>Beginning</th>
                    <th>Middle</th>
                    <th>End</th>
                    <th>Linked sentence</th>
                  </tr>
                </thead>
                <tbody>
                  {sounds.map((s, i) => (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td>
                        <b>
                          {s.glyph} {s.title}
                        </b>
                        <div className="mini">{s.ipa}</div>
                      </td>
                      <td>{s.spoken}</td>
                      {(["beginning", "middle", "end"] as const).map((pos) => {
                        const ex = s.examples.find((e) => e.position === pos);
                        return (
                          <td key={pos}>
                            <b>{ex?.word}</b>
                            <div className="mini">{ex?.hint}</div>
                          </td>
                        );
                      })}
                      <td>“{s.sentence}”</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SentenceCatalog() {
  const today = dailyPhonics();
  const upcoming = Array.from({ length: 14 }, (_, i) => phonicsForOffset(i));
  return (
    <div className="catalog">
      <article className="card" style={{ marginBottom: 16, textAlign: "center" }}>
        <div className="eyebrow">Live in the app today</div>
        <div className="glyph">{today.glyph}</div>
        <p className="hint">
          {today.title} · {today.spoken}
        </p>
        <p className="sentence">“{today.sentence}”</p>
      </article>
      <p className="lead" style={{ marginBottom: 12 }}>
        Rotation order: one phonics sound per UTC day, looping the chart. The child must say every content word.
      </p>
      <div className="table-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th>Date</th>
              <th>Sound</th>
              <th>Cue</th>
              <th>Sentence the child says</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((row) => (
              <tr key={row.date} className={row.offset === 0 ? "row-now" : undefined}>
                <td>
                  {row.date}
                  {row.offset === 0 ? " · today" : ""}
                </td>
                <td>
                  {row.sound.glyph} {row.sound.title}
                </td>
                <td>{row.sound.spoken}</td>
                <td>“{row.sound.sentence}”</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const STORY_BEATS = ["The park", "Throw", "Under the tree", "Run", "Look", "Find it", "Smile"];

function StoryCatalog() {
  return (
    <div className="catalog">
      <p className="lead" style={{ marginBottom: 12 }}>
        {STORY.title} — {STORY.sentences.length} scenes in plot order, then a correction page for missed words. Bonus:{" "}
        {STORY.bonusPoints} Buzz Points.
      </p>
      <ol className="scene-list">
        {STORY.sentences.map((s, i) => (
          <li key={s.text} className="scene">
            <div className="scene-num">
              {i + 1}. {STORY_BEATS[i]}
            </div>
            <p className="scene-line">“{s.text}”</p>
            {i > 0 ? <p className="mini">Just before this: {STORY.sentences[i - 1].text}</p> : null}
            <p className="mini">
              Sound hints:{" "}
              {Object.entries(s.soundHints)
                .map(([word, sound]) => `${word} → ${sound}`)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ol>
      <p className="hint" style={{ marginTop: 12 }}>
        After scene 7 the app opens the correction page. Missed words are practised one by one, then the bonus is
        collected.
      </p>
    </div>
  );
}

function VerbsCatalog() {
  const week = weeklyVerbs();
  const weekIds = new Set(week.map((v) => v.id));
  return (
    <div className="catalog">
      <h3>This week’s set (order on the grid)</h3>
      <div className="table-wrap" style={{ margin: "10px 0 20px" }}>
        <table className="sheet">
          <thead>
            <tr>
              <th>#</th>
              <th>Action</th>
              <th>Spoken</th>
              <th>Sentence the child says</th>
            </tr>
          </thead>
          <tbody>
            {week.map((v, i) => (
              <tr key={v.id} className="row-now">
                <td>{i + 1}</td>
                <td>
                  {v.emoji} <b>{v.word}</b>
                </td>
                <td>{v.spoken}</td>
                <td>“{v.sentence}”</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Full pool (weekly rotation of 8)</h3>
      <div className="table-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th>#</th>
              <th>Action</th>
              <th>Spoken</th>
              <th>Sentence</th>
              <th>This week</th>
            </tr>
          </thead>
          <tbody>
            {VERB_POOL.map((v, i) => (
              <tr key={v.id} className={weekIds.has(v.id) ? "row-now" : undefined}>
                <td>{i + 1}</td>
                <td>
                  {v.emoji} {v.word}
                </td>
                <td>{v.spoken}</td>
                <td>“{v.sentence}”</td>
                <td>{weekIds.has(v.id) ? "Yes" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrepCatalog() {
  const place = PREPOSITIONS.filter((q) => q.kind === "place");
  const move = PREPOSITIONS.filter((q) => q.kind === "movement");
  return (
    <div className="catalog">
      <p className="lead" style={{ marginBottom: 12 }}>
        Source order below. The kids app shuffles the deck each visit. Each item is a cloze: look at the bee, tap one of
        two words, hear the full sentence.
      </p>
      {[
        { label: "Place — Where is the bee?", rows: place },
        { label: "Movement — Where is the bee going?", rows: move },
      ].map((block) => (
        <section key={block.label} className="catalog-block">
          <h3>{block.label}</h3>
          <div className="table-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Id</th>
                  <th>Cloze</th>
                  <th>Choices</th>
                  <th>Correct</th>
                  <th>Full sentence</th>
                </tr>
              </thead>
              <tbody>
                {block.rows.map((q, i) => (
                  <tr key={q.id}>
                    <td>{i + 1}</td>
                    <td>{q.id}</td>
                    <td>{q.cloze}</td>
                    <td>{q.options.join(" / ")}</td>
                    <td>
                      <b>{q.answer}</b>
                    </td>
                    <td>“{q.cloze.replace("___", q.answer)}”</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
