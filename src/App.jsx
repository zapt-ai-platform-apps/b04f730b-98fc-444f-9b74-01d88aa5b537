```jsx
import { createSignal, Show, onMount } from 'solid-js';
import { createEvent } from './supabaseClient';
import { saveAs } from 'file-saver';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';
import { SolidMarkdown } from 'solid-markdown';

function App() {
  const [activityDescription, setActivityDescription] = createSignal('');
  const [roleDescription, setRoleDescription] = createSignal('');
  const [report, setReport] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleGenerateReport = async () => {
    if (!activityDescription() || !roleDescription()) {
      alert('Please fill in both fields.');
      return;
    }

    setLoading(true);
    try {
      const prompt = `
You are a UK health and safety expert.

Based on the following information, generate a detailed report:

Work Activity Description:
"${activityDescription()}"

Role in Activity:
"${roleDescription()}"

The report should include:

1. Applicable UK health and safety legislation related to this work activity.
2. Comprehensive advice on how the user and their team might safely approach the project.
3. A table of risks likely to be encountered during this work and suggested mitigation strategies to reduce the likelihood of these risks occurring.

Format the report with clear headings and the table should be neat and easy to read.
`;

      const result = await createEvent('chatgpt_request', {
        prompt: prompt,
        response_type: 'text',
      });
      setReport(result);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareReport = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Health and Safety Report',
          text: report(),
        })
        .catch((error) => console.error('Error sharing:', error));
    } else {
      alert('Sharing is not supported on this browser.');
    }
  };

  const handleSaveReport = async () => {
    try {
      const doc = new Document();

      const markdownContent = report();
      const lines = markdownContent.split('\n');

      lines.forEach((line) => {
        if (line.startsWith('# ')) {
          doc.addSection({
            properties: {},
            children: [
              new Paragraph({
                text: line.replace('# ', ''),
                heading: 'Title',
              }),
            ],
          });
        } else if (line.startsWith('## ')) {
          doc.addSection({
            properties: {},
            children: [
              new Paragraph({
                text: line.replace('## ', ''),
                heading: 'Heading1',
              }),
            ],
          });
        } else if (line.startsWith('|')) {
          const tableRows = lines
            .filter((l) => l.startsWith('|'))
            .map((row) =>
              row
                .split('|')
                .filter((cell) => cell.trim() !== '')
                .map((cell) => cell.trim())
            );

          const table = new Table({
            rows: tableRows.map(
              (cells) =>
                new TableRow({
                  children: cells.map(
                    (cell) =>
                      new TableCell({
                        width: {
                          size: 100 / cells.length,
                          type: WidthType.PERCENTAGE,
                        },
                        children: [new Paragraph(cell)],
                      })
                  ),
                })
            ),
          });

          doc.addSection({
            properties: {},
            children: [table],
          });
        } else {
          doc.addSection({
            properties: {},
            children: [
              new Paragraph({
                children: [new TextRun(line)],
              }),
            ],
          });
        }
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'Health-and-Safety-Report.docx');
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <div class="w-full max-w-3xl p-6 bg-white rounded-lg shadow-md h-full">
        <h1 class="text-3xl font-bold mb-6 text-center text-gray-800">
          Health and Safety Report Generator
        </h1>
        <form
          class="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerateReport();
          }}
        >
          <div>
            <label class="block text-gray-700 mb-2" for="activityDescription">
              Work Activity Description
            </label>
            <textarea
              id="activityDescription"
              class="w-full px-4 py-2 border rounded-lg box-border focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
              placeholder="Describe the work activity..."
              value={activityDescription()}
              onInput={(e) => setActivityDescription(e.target.value)}
            ></textarea>
          </div>
          <div>
            <label class="block text-gray-700 mb-2" for="roleDescription">
              Your Role in the Activity
            </label>
            <input
              type="text"
              id="roleDescription"
              class="w-full px-4 py-2 border rounded-lg box-border focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your role..."
              value={roleDescription()}
              onInput={(e) => setRoleDescription(e.target.value)}
            />
          </div>
          <div class="flex justify-center">
            <button
              type="submit"
              class="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer"
              disabled={loading()}
            >
              <Show when={loading()} fallback="Generate Report">
                Generating...
              </Show>
            </button>
          </div>
        </form>
        <Show when={report()}>
          <div class="mt-8">
            <h2 class="text-2xl font-semibold mb-4 text-gray-800">
              Generated Report
            </h2>
            <div class="prose prose-lg max-w-none">
              <SolidMarkdown children={report()} />
            </div>
            <div class="mt-6 flex justify-center space-x-4">
              <button
                class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 cursor-pointer"
                onClick={handleShareReport}
              >
                Share Report
              </button>
              <button
                class="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 cursor-pointer"
                onClick={handleSaveReport}
              >
                Save as Word Document
              </button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default App;
```